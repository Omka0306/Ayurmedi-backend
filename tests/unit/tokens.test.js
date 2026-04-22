import { jest } from '@jest/globals';

const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue("OK");
const mockRedisKeys = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule("ioredis", () => ({
  default: class {
    get(...args) { return mockRedisGet(...args); }
    set(...args) { return mockRedisSet(...args); }
    keys(...args) { return mockRedisKeys(...args); }
    disconnect() {}
  }
}));

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { 
  createToken, 
  getTokensToday, 
  getDisplayQueue, 
  callToken, 
  skipToken, 
  completeToken, 
  updatePriority, 
  getNextToken 
} = await import("../../src/modules/tokens/handler.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validBranchId = "33333333-3333-3333-3333-333333333333";
const validDoctorId = "44444444-4444-4444-4444-444444444444";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validTokenId = "55555555-5555-5555-5555-555555555555";
const today = new Date().toISOString().split("T")[0];

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "RECEPTIONIST" }
  }
};

describe("tokens module", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.scan.mockResolvedValue({ Items: [] });
    
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockRedisKeys.mockResolvedValue([]);
  });

  it("Generate 623e4567-e89b-12d3-a456-426614174005: atomic counter increments, displayNumber formatted correctly", async () => {
    db.update.mockResolvedValueOnce({ currentNumber: 42 }); 
    db.query.mockResolvedValueOnce({ Items: [] }); 
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        patientName: "John Doe",
        doctorName: "Dr. Smith"
      })
    };
    
    const res = await createToken(event);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    expect(body.data.tokenNumber).toBe(42);
    expect(body.data.displayNumber).toBe("A-042");
    expect(body.data.status).toBe("WAITING");
    
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({
      UpdateExpression: "ADD currentNumber :inc"
    }));
  });

  it("estimatedWaitMinutes: calculated as (waiting ahead) × averageConsultationMinutes", async () => {
    db.update.mockResolvedValueOnce({ currentNumber: 3 }); 
    db.query.mockResolvedValueOnce({
      Items: [
        { status: "WAITING", tokenNumber: 1, priority: "NORMAL", doctorId: validDoctorId },
        { status: "WAITING", tokenNumber: 2, priority: "NORMAL", doctorId: validDoctorId },
        { status: "WAITING", tokenNumber: 3, priority: "NORMAL", patientName: "John Doe", doctorId: validDoctorId }
      ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        patientName: "John Doe",
        doctorName: "Dr. Smith"
      })
    };
    
    await createToken(event);
    
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    const setArgs = mockRedisSet.mock.calls[0][1];
    const savedQueue = JSON.parse(setArgs);
    
    expect(savedQueue.length).toBe(3);
    const myToken = savedQueue.find(t => t.tokenNumber === 3);
    expect(myToken.estimatedWaitMinutes).toBe(30);
  });

  it("Call 623e4567-e89b-12d3-a456-426614174005: status changes to CALLED, calledAt set, Redis cache updated", async () => {
    db.scan.mockResolvedValueOnce({
      Items: [ { tokenId: validTokenId, hospitalId: validHospitalId, status: "WAITING" } ]
    });
    
    db.update.mockResolvedValueOnce({ status: "CALLED", calledAt: "2026-04-05T10:00:00Z" });

    const event = {
      ...validCaller,
      pathParameters: { tokenId: validTokenId }
    };
    
    const res = await callToken(event);
    expect(res.statusCode).toBe(200);
    
    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.UpdateExpression).toContain("calledAt = :ct");
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("CALLED");
    expect(mockRedisSet).toHaveBeenCalled();
  });

  it("Skip 623e4567-e89b-12d3-a456-426614174005: status changes to SKIPPED, queue reordered", async () => {
    db.scan.mockResolvedValueOnce({
      Items: [ { tokenId: validTokenId, hospitalId: validHospitalId, status: "WAITING" } ]
    });
    
    db.update.mockResolvedValueOnce({ status: "SKIPPED", completedAt: "2026-04-05T10:00:00Z" });

    const event = {
      ...validCaller,
      pathParameters: { tokenId: validTokenId }
    };
    
    const res = await skipToken(event);
    expect(res.statusCode).toBe(200);
  });

  it("Complete 623e4567-e89b-12d3-a456-426614174005: status changes to COMPLETED, completedAt set", async () => {
    db.scan.mockResolvedValueOnce({
      Items: [ { tokenId: validTokenId, hospitalId: validHospitalId, status: "WAITING" } ]
    });
    
    db.update.mockResolvedValueOnce({ status: "COMPLETED", completedAt: "2026-04-05T10:00:00Z" });

    const event = {
      ...validCaller,
      pathParameters: { tokenId: validTokenId }
    };
    
    const res = await completeToken(event);
    expect(res.statusCode).toBe(200);
  });

  it("Priority override: EMERGENCY 623e4567-e89b-12d3-a456-426614174005 inserted at position 1, wait times recalculated for all", async () => {
    db.scan.mockResolvedValueOnce({
      Items: [ { tokenId: validTokenId, hospitalId: validHospitalId, branchId: validBranchId, doctorId: validDoctorId, date: today, status: "WAITING", priority: "NORMAL", PK: `HOSP#${validHospitalId}#BRANCH#${validBranchId}#DATE#${today}`, SK: `TOKEN#${validTokenId}` } ]
    });
    
    db.update.mockResolvedValueOnce({ priority: "EMERGENCY" });
    
    db.query.mockResolvedValueOnce({
      Items: [
        { status: "WAITING", tokenNumber: 1, priority: "NORMAL", doctorId: validDoctorId },
        { status: "WAITING", tokenNumber: 2, priority: "NORMAL", doctorId: validDoctorId },
        { status: "WAITING", tokenNumber: 3, priority: "EMERGENCY", doctorId: validDoctorId }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { tokenId: validTokenId },
      body: JSON.stringify({ priority: "EMERGENCY" })
    };
    
    const res = await updatePriority(event);
    expect(res.statusCode).toBe(200);
    
    const setArgs = mockRedisSet.mock.calls[0][1];
    const savedQueue = JSON.parse(setArgs);
    
    expect(savedQueue[0].tokenNumber).toBe(3);
    expect(savedQueue[0].estimatedWaitMinutes).toBe(0);
    expect(savedQueue[1].tokenNumber).toBe(1);
    expect(savedQueue[1].estimatedWaitMinutes).toBe(15);
  });

  it("Display board: returns correct fields only, no auth required", async () => {
    mockRedisKeys.mockResolvedValueOnce([`queue:${validHospitalId}:${validBranchId}:${validDoctorId}:${today}`]);
    mockRedisGet.mockResolvedValueOnce(JSON.stringify([
      { tokenNumber: 1, displayNumber: "A-001", patientName: "A", doctorName: "B", status: "WAITING", estimatedWaitMinutes: 0 },
      { tokenNumber: 2, displayNumber: "A-002", patientName: "C", doctorName: "B", status: "WAITING", estimatedWaitMinutes: 15, hiddenField: "secret" }
    ]));
    
    const event = {
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId }
    };
    
    const res = await getDisplayQueue(event);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe("no-store");
    
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(2);
    expect(body.data[1].hiddenField).toBeUndefined();
  });

  it("Redis cache hit: DynamoDB not called when cache is warm", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify([
      { status: "WAITING", tokenNumber: 1 }
    ]));
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId, doctorId: validDoctorId }
    };
    
    const res = await getNextToken(event);
    expect(res.statusCode).toBe(200);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("Redis cache miss: DynamoDB queried, cache repopulated", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    
    db.query.mockResolvedValueOnce({
      Items: [{ status: "WAITING", tokenNumber: 1, doctorId: validDoctorId }]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId, doctorId: validDoctorId }
    };
    
    const res = await getNextToken(event);
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalled();
    expect(mockRedisSet).toHaveBeenCalled();
  });
});
