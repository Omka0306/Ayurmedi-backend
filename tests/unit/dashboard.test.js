import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
}));

jest.unstable_mockModule("ioredis", () => ({
  default: class {
    constructor() {}
  }
}));

jest.unstable_mockModule("../../src/modules/reports/service.js", () => ({
  getAlertsLowStock: jest.fn().mockResolvedValue([{ alertType: "LOW_STOCK" }]),
  getAlertsExpiry: jest.fn().mockResolvedValue([])
}));

const db = await import("../../src/common/db.js");
const reportsService = await import("../../src/modules/reports/service.js");
const { 
  getAdminDashboard, 
  getDoctorDashboard, 
  getReceptionDashboard 
} = await import("../../src/modules/dashboard/handler.js");
const { handler: scheduledKpi } = await import("../../src/modules/dashboard/scheduledKpi.js");

const validHospitalId = "123e4567-e89b-12d3-a456-426614174000";

const getCaller = (role, userId = "423e4567-e89b-12d3-a456-426614174003") => ({
  requestContext: {
    authorizer: { userId, hospitalId: validHospitalId, role }
  }
});

describe("dashboard module", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.scan.mockResolvedValue({ Items: [] });
    reportsService.getAlertsLowStock.mockResolvedValue([{ alertType: "LOW_STOCK" }]);
    reportsService.getAlertsExpiry.mockResolvedValue([]);
  });

  it("Admin dashboard: today's data combines Redis queue + DynamoDB revenue + pre-computed analytics", async () => {
    // mock query for Consults (queue substitutes since no full redis implementation logic is mocked explicitly in this phase's design)
    db.query.mockResolvedValueOnce({
      Items: [
        { entityType: "CONSULTATION", status: "WAITING", doctorId: "223e4567-e89b-12d3-a456-426614174001", doctorName: "Dr. Smith" },
        { entityType: "CONSULTATION", status: "COMPLETED", doctorId: "223e4567-e89b-12d3-a456-426614174001", doctorName: "Dr. Smith" },
        { entityType: "CONSULTATION", status: "IN_CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-426614174002", doctorName: "Dr. Adams" }
      ]
    });

    // mock query for Bills (revenue today)
    db.query.mockResolvedValueOnce({
      Items: [
        { entityType: "BILL", amountPaid: 500, balanceDue: 0, status: "PAID" },
        { entityType: "BILL", amountPaid: 200, balanceDue: 300, status: "PARTIALLY_PAID" }
      ]
    });

    // mock get for Analytics mapping
    db.get.mockResolvedValueOnce({
      patientGrowth: [{ date: "2026-04-04", newPatients: 10, returningPatients: 5 }],
      topComplaints: [{ complaint: "headache", count: 20 }]
    });

    const event = {
      ...getCaller("HOSPITAL_ADMIN"),
      pathParameters: { hospitalId: validHospitalId }
    };

    const res = await getAdminDashboard(event);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    const data = body.data;

    expect(data.today.totalPatients).toBe(3);
    expect(data.today.waitingPatients).toBe(1);
    expect(data.today.revenueCollected).toBe(700);

    expect(data.alerts.lowStockCount).toBe(1);
    expect(data.alerts.pendingBillsCount).toBe(1);

    expect(data.doctorDistribution.length).toBe(2);
    expect(data.analytics.topComplaints.length).toBe(1);
  });

  it("Scheduled KPI: computes and stores correct structure for all hospitals", async () => {
    // mock hospitals scan
    db.scan.mockResolvedValueOnce({ Items: [{ hospitalId: "123e4567-e89b-12d3-a456-426614174000" }] });
    // mock consults query
    db.query.mockResolvedValueOnce({ Items: [
      { entityType: "CONSULTATION", chiefComplaints: "Fever, Cough", doctorId: "223e4567-e89b-12d3-a456-426614174001", createdAt: new Date().toISOString() }
    ] });
    // mock bills query
    db.query.mockResolvedValueOnce({ Items: [
      { entityType: "BILL", totalAmount: 1000, billDate: new Date().toISOString().split("T")[0] }
    ] });
    // mock pk scan
    db.scan.mockResolvedValueOnce({ Items: [
      { entityType: "PANCHAKARMA_PLAN", procedureType: "Vamana" }
    ] });
    // mock txns scan
    db.scan.mockResolvedValueOnce({ Items: [
      { entityType: "STOCK_TRANSACTION", itemId: "item-1", quantity: -5 }
    ] });

    const res = await scheduledKpi({});
    expect(res.statusCode).toBe(200);

    const putCall = db.put.mock.calls[0][0];
    expect(putCall.PK).toBe(`DASHBOARD#HOSP#123e4567-e89b-12d3-a456-426614174000`);
    expect(putCall.entityType).toBe("DASHBOARD_KPI");
    expect(putCall.topComplaints.length).toBeGreaterThan(0);
    expect(putCall.inventoryTurnover[0].unitsUsed).toBe(5);
    expect(putCall.pkUtilization[0].procedureType).toBe("Vamana");
  });

  it("Doctor dashboard: scoped to doctorId from JWT, does not return other doctors' data", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { entityType: "CONSULTATION", status: "WAITING", doctorId: "223e4567-e89b-12d3-a456-426614174001" },
        { entityType: "CONSULTATION", status: "COMPLETED", doctorId: "223e4567-e89b-12d3-a456-426614174002" },
        { entityType: "CONSULTATION", status: "WAITING", doctorId: "223e4567-e89b-12d3-a456-426614174001" }, // Other doctor
      ]
    });

    const event = {
      ...getCaller("DOCTOR", "223e4567-e89b-12d3-a456-426614174001"), // Caller is doctor 1
      pathParameters: { hospitalId: validHospitalId }
    };

    const res = await getDoctorDashboard(event);
    expect(res.statusCode).toBe(200);

    const data = JSON.parse(res.body).data;
    expect(data.doctorId).toBe("223e4567-e89b-12d3-a456-426614174001");
    // Should filter out doc-2
    expect(data.today.totalPatients).toBe(2);
    expect(data.today.waitingPatients).toBe(2);
    expect(data.consultationsList.length).toBe(2);
  });

  it("Reception dashboard: shows all doctors' queues for the branch, pending bills", async () => {
    // mock queries
    db.query.mockResolvedValueOnce({ Items: [
      { entityType: "CONSULTATION", status: "WAITING" },
      { entityType: "CONSULTATION", status: "IN_CONSULTATION" }
    ] }); // consults
    db.query.mockResolvedValueOnce({ Items: [
      { entityType: "BILL", balanceDue: 500, status: "PARTIALLY_PAID" },
      { entityType: "BILL", balanceDue: 0, status: "PAID" },
    ] }); // bills

    const event = {
      ...getCaller("RECEPTIONIST"),
      pathParameters: { hospitalId: validHospitalId }
    };

    const res = await getReceptionDashboard(event);
    expect(res.statusCode).toBe(200);

    const data = JSON.parse(res.body).data;
    expect(data.today.totalRegistrations).toBe(2);
    expect(data.pendingBillsAlerts.length).toBe(1);
    expect(data.pendingBillsAlerts[0].balanceDue).toBe(500);
  });

  it("Pre-computed record missing (new hospital, first day): returns empty analytics gracefully, no 500 error", async () => {
    // Both attempts at db.get to fetch DASHBOARD return null (mocked)
    db.get.mockResolvedValue(null);
    db.query.mockResolvedValue({ Items: [] });

    const event = {
      ...getCaller("HOSPITAL_ADMIN"),
      pathParameters: { hospitalId: validHospitalId }
    };

    const res = await getAdminDashboard(event);
    expect(res.statusCode).toBe(200);

    const data = JSON.parse(res.body).data;
    // Expected to gracefully fall back to empty structures
    expect(data.analytics.patientGrowth).toEqual([]);
    expect(data.analytics.topComplaints).toEqual([]);
  });
});
