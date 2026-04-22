import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { listDoctors, createDoctor, updateDoctor, deleteDoctor } = await import("../../src/modules/doctors/handler.js");

describe("doctor module", () => {
  const validCaller = {
    requestContext: {
      authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: "11111111-1111-1111-1111-111111111111", role: "HOSPITAL_ADMIN" }
    }
  };

  beforeEach(() => {
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.get.mockReset();
    db.put.mockReset();
    db.update.mockReset();
    db.query.mockReset();
  });

  it("list doctor: returns only active doctor", async () => {
    db.query.mockResolvedValueOnce({
      Items: [{ doctorId: "44444444-4444-4444-4444-444444444444", status: "ACTIVE" }, { doctorId: "55555555-5555-5555-5555-555555555555", status: "INACTIVE" }]
    });
    const event = { ...validCaller, pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" } };
    const res = await listDoctors(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].doctorId).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("create doctor: valid payload works", async () => {
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" },
      body: JSON.stringify({
        userId: "123e4567-e89b-12d3-a456-426614174000",
        branchIds: ["33333333-3333-3333-3333-333333333333"],
        name: "Dr. Smith",
        specialization: "General",
        registrationNumber: "REG123"
      })
    };
    const res = await createDoctor(event);
    expect(res.statusCode).toBe(201);
    expect(db.put).toHaveBeenCalledTimes(3);
  });

  it("update doctor: validates payload correctly and updates", async () => {
    db.get.mockResolvedValueOnce({ PK: "HOSP#11111111-1111-1111-1111-111111111111", SK: "DOCTOR#44444444-4444-4444-4444-444444444444", status: "ACTIVE" });
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111", doctorId: "44444444-4444-4444-4444-444444444444" },
      body: JSON.stringify({ availabilityStatus: "BUSY" })
    };
    const res = await updateDoctor(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("delete doctor: soft deletes the doctor", async () => {
    db.get.mockResolvedValueOnce({ PK: "HOSP#11111111-1111-1111-1111-111111111111", SK: "DOCTOR#44444444-4444-4444-4444-444444444444", status: "ACTIVE" });
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111", doctorId: "44444444-4444-4444-4444-444444444444" }
    };
    const res = await deleteDoctor(event);
    expect(res.statusCode).toBe(200);
    
    expect(db.update).toHaveBeenCalledTimes(1);
    const updateArg = db.update.mock.calls[0][0];
    expect(updateArg.UpdateExpression).toContain(":status");
    expect(updateArg.ExpressionAttributeValues[":status"]).toBe("INACTIVE");
  });
});
