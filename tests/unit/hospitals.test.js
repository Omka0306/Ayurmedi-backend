import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  update: jest.fn(),
  put: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { getHospital, updateHospital } = await import("../../src/modules/hospitals/handler.js");

describe("hospitals module", () => {
  const validCaller = {
    requestContext: {
      authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: "11111111-1111-1111-1111-111111111111", role: "HOSPITAL_ADMIN" }
    }
  };

  beforeEach(() => {
    db.get.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.put.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.get.mockReset();
    db.update.mockReset();
    db.put.mockReset();
  });

  it("get hospital: returns hospital if hospitalId matches JWT", async () => {
    db.get.mockResolvedValueOnce({ PK: "HOSP#11111111-1111-1111-1111-111111111111", status: "ACTIVE" });
    const event = { ...validCaller, pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" } };
    const res = await getHospital(event);
    expect(res.statusCode).toBe(200);
    expect(db.get).toHaveBeenCalledTimes(1);
  });

  it("get hospital: throws 403 if hospitalId differs from JWT", async () => {
    const event = { ...validCaller, pathParameters: { hospitalId: "22222222-2222-2222-2222-222222222222" } };
    const res = await getHospital(event);
    expect(res.statusCode).toBe(403);
  });

  it("update hospital: updates valid fields and calls audit logger", async () => {
    db.get.mockResolvedValueOnce({ PK: "HOSP#11111111-1111-1111-1111-111111111111", status: "ACTIVE" });
    db.update.mockResolvedValueOnce({ name: "New Name" });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" },
      body: JSON.stringify({ name: "New Name", consultationFee: 1000 })
    };
    const res = await updateHospital(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledTimes(2);
  });
});
