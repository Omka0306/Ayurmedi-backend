import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
}));

jest.unstable_mockModule("../../src/modules/tokens/service.js", () => ({
  generateDoctorToken: jest.fn(),
  markTokenComplete: jest.fn()
}));

const db = await import("../../src/common/db.js");
const tokenService = await import("../../src/modules/tokens/service.js");
const { 
  createConsultation, 
  getConsultations, 
  getConsultationDetail, 
  updateConsultation, 
  completeConsultation 
} = await import("../../src/modules/consultations/handler.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validBranchId = "33333333-3333-3333-3333-333333333333";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validDoctorId = "44444444-4444-4444-4444-444444444444";
const validConsultId = "55555555-5555-5555-5555-555555555555";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "DOCTOR" }
  }
};

describe("consultations module", () => {
  beforeEach(() => {
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    tokenService.markTokenComplete.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Create consultation: creates with IN_PROGRESS status, links tokenId", async () => {
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId },
      body: JSON.stringify({
        doctorId: validDoctorId,
        hospitalId: validHospitalId,
        branchId: validBranchId,
        tokenId: "42",
        chiefComplaint: "Fever and cough"
      })
    };
    
    const res = await createConsultation(event);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("IN_PROGRESS");
    expect(body.data.tokenId).toBe("42");
    expect(body.data.doctorId).toBe(validDoctorId);
    
    const putCall = db.put.mock.calls[0][0];
    expect(putCall.entityType).toBe("CONSULTATION");
  });

  it("Update consultation: updates examination fields, audit log called", async () => {
    db.get.mockResolvedValueOnce({
      status: "IN_PROGRESS",
      hospitalId: validHospitalId,
      branchId: validBranchId
    });
    
    const updateSpy = db.update.mockResolvedValueOnce({ updated: true });
    
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId, consultId: validConsultId },
      body: JSON.stringify({
        clinicalExamination: {
          generalCondition: "Stable",
          vitalSigns: { bp: "120/80", pulse: 72 }
        }
      })
    };
    
    const res = await updateConsultation(event);
    expect(res.statusCode).toBe(200);
    
    const updateArgs = updateSpy.mock.calls[0][0];
    expect(updateArgs.UpdateExpression).toContain("clinicalExamination = :ce");
    expect(updateArgs.ExpressionAttributeValues[":ce"].vitalSigns.bp).toBe("120/80");
    
    expect(db.put).toHaveBeenCalled();
  });

  it("Update completed consultation: returns 409", async () => {
    db.get.mockResolvedValueOnce({
      status: "COMPLETED",
      hospitalId: validHospitalId
    });
    
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId, consultId: validConsultId },
      body: JSON.stringify({ chiefComplaint: "New complaint" })
    };
    
    const res = await updateConsultation(event);
    expect(res.statusCode).toBe(409);
  });

  it("Complete consultation: sets status=COMPLETED, calls 623e4567-e89b-12d3-a456-426614174005 service to mark 623e4567-e89b-12d3-a456-426614174005 complete", async () => {
    db.get.mockResolvedValueOnce({
      status: "IN_PROGRESS",
      hospitalId: validHospitalId,
      branchId: validBranchId,
      doctorId: validDoctorId,
      visitDate: "2026-04-05",
      tokenId: "42"
    });
    
    db.update.mockResolvedValueOnce({ status: "COMPLETED" });
    
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId, consultId: validConsultId }
    };
    
    const res = await completeConsultation(event);
    expect(res.statusCode).toBe(200);
    
    const updateArgs = db.update.mock.calls[0][0];
    expect(updateArgs.UpdateExpression).toContain("#st = :status");
    expect(updateArgs.ExpressionAttributeValues[":status"]).toBe("COMPLETED");
    
    expect(tokenService.markTokenComplete).toHaveBeenCalledWith(
      validHospitalId, validBranchId, validDoctorId, "2026-04-05", "42"
    );
  });

  it("List consultations: returns sorted by visitDate descending, scoped to patientId", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { consultId: "c1", hospitalId: validHospitalId, createdAt: "2026-01-01T00:00:00Z" },
        { consultId: "c2", hospitalId: validHospitalId, createdAt: "2026-10-01T00:00:00Z" },
        { consultId: "c3", hospitalId: validHospitalId, createdAt: "2026-05-01T00:00:00Z" }
      ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId }
    };
    
    const res = await getConsultations(event);
    expect(res.statusCode).toBe(200);
    
    const body = JSON.parse(res.body);
    expect(body.data[0].consultId).toBe("c2");
    expect(body.data[1].consultId).toBe("c3");
    expect(body.data[2].consultId).toBe("c1");
  });

  it("Get consultation: returns correct item, enforces hospitalId from JWT", async () => {
    db.get.mockResolvedValueOnce({
      consultId: validConsultId,
      hospitalId: validHospitalId
    });
    
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId, consultId: validConsultId }
    };
    
    const res = await getConsultationDetail(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.consultId).toBe(validConsultId);
    
    // 401 test
    db.get.mockResolvedValueOnce({
      consultId: validConsultId,
      hospitalId: "00000000-0000-0000-0000-000000000000"
    });
    const res403 = await getConsultationDetail(event);
    expect(res403.statusCode).toBe(401);
  });
});
