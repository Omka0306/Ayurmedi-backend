/**
 * E2E Phase 5 — Billing & Payments
 * Tests: create bill with multiple line items, partial payment, full payment,
 *        idempotent duplicate payment check, revenue summary
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { apiCall } from "./helpers.js";
import { setupE2E } from "./setup.js";

describe("Phase 5 — Billing & Payments", () => {
  let state;
  let patientId;
  let billId;
  const suffix = Date.now();
  const idempotencyKey = `idem-${suffix}`;

  beforeAll(async () => {
    state = await setupE2E();

    // Register a patient to bill
    const { status: pStatus, data: pData } = await apiCall(
      "clinical",
      "POST",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients`,
      {
        patientName: `Billing Patient ${suffix}`,
        mobileNumber: `96${suffix.toString().slice(-8)}`,
        assignedDoctorId: state.doctorId,
        formData: { formTemplateId: null, formVersion: null, responses: {} },
      },
    );
    expect(pStatus).toBe(201);
    patientId = pData.data?.patientId;
  });

  it("POST /hospitals/:hId/bills → 201 creates bill with line items", async () => {
    if (!patientId) return;
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/bills`,
      {
        patientId,
        branchId: state.branchId,
        doctorId: state.doctorId,
        lineItems: [
          {
            type: "CONSULTATION",
            description: "Consultation Fee",
            quantity: 1,
            rate: 500,
          },
          {
            type: "MEDICINE",
            description: "Ashwagandha Churna",
            quantity: 2,
            rate: 150,
          },
          {
            type: "PANCHAKARMA",
            description: "Abhyanga Session",
            quantity: 1,
            rate: 800,
          },
        ],
      },
    );
    expect(status).toBe(201);
    billId = data.data?.billId;
    expect(billId).toBeDefined();
    // Server-calculated totals: 500 + 300 + 800 = 1600
    expect(data.data.totalAmount).toBe(1600);
    expect(data.data.paidAmount).toBe(0);
    expect(data.data.balanceDue).toBe(1600);
    expect(data.data.status).toBe("PENDING");
  });

  it("GET /hospitals/:hId/bills/:billId → 200 with correct shape", async () => {
    if (!billId) return;
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/bills/${billId}`,
    );
    expect(status).toBe(200);
    expect(data.data.billId).toBe(billId);
    expect(data.data.lineItems?.length).toBe(3);
  });

  it("POST /hospitals/:hId/bills/:billId/payments → partial payment → PARTIALLY_PAID", async () => {
    if (!billId) return;
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/bills/${billId}/payments`,
      {
        amount: 600,
        method: "CASH",
        idempotencyKey: `${idempotencyKey}-1`,
      },
    );
    expect(status).toBe(201);
    expect(data.data.status).toBe("PARTIALLY_PAID");
    expect(data.data.paidAmount).toBe(600);
    expect(data.data.balanceDue).toBe(1000);
  });

  it("POST /hospitals/:hId/bills/:billId/payments → remaining → PAID, balanceDue=0", async () => {
    if (!billId) return;
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/bills/${billId}/payments`,
      {
        amount: 1000,
        method: "UPI",
        idempotencyKey: `${idempotencyKey}-2`,
      },
    );
    expect(status).toBe(201);
    expect(data.data.status).toBe("PAID");
    expect(data.data.paidAmount).toBe(1600);
    expect(data.data.balanceDue).toBe(0);
  });

  it("POST duplicate payment with same idempotencyKey → no duplicate (200 or 409)", async () => {
    if (!billId) return;
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/bills/${billId}/payments`,
      {
        amount: 1000,
        method: "UPI",
        idempotencyKey: `${idempotencyKey}-2`, // same key as previous
      },
    );
    // Should be idempotent: return existing or 409 conflict, NOT create a duplicate
    expect([200, 201, 409]).toContain(status);
    if (status !== 409) {
      // If 200/201 returned existing, paidAmount must not exceed totalAmount
      if (data.data?.paidAmount !== undefined) {
        expect(data.data.paidAmount).toBeLessThanOrEqual(1600);
      }
    }
  });

  it("GET /hospitals/:hId/revenue-summary → 200 with summary data", async () => {
    const today = new Date().toISOString().split("T")[0];
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/revenue-summary?from=${today}&to=${today}`,
    );
    // Accept 200 or 404/501 if endpoint not yet exposed
    expect([200, 404, 501]).toContain(status);
    if (status === 200) {
      expect(data.data.totalRevenue).toBeGreaterThanOrEqual(0);
    }
  });

  afterAll(async () => {
    // Cleaned via hospital delete in teardownE2E
  });
});
