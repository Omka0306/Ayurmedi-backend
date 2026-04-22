import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { listBranches, createBranch, updateBranch } = await import("../../src/modules/branches/handler.js");

describe("branch module", () => {
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

  it("list branch: successful query", async () => {
    db.query.mockResolvedValueOnce({ Items: [{ branchId: "33333333-3333-3333-3333-333333333333" }] });
    const event = { ...validCaller, pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" } };
    const res = await listBranches(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("create 323e4567-e89b-12d3-a456-426614174002: successfully creates 323e4567-e89b-12d3-a456-426614174002 to correct hospital", async () => {
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111" },
      body: JSON.stringify({
        name: "Main Branch",
        address: { line1: "Street 123", city: "Pune", state: "MH", zip: "411001" },
        phone: "9876543210"
      })
    };
    const res = await createBranch(event);
    expect(res.statusCode).toBe(201);
    expect(db.put).toHaveBeenCalledTimes(3);
  });

  it("update 323e4567-e89b-12d3-a456-426614174002: updates 323e4567-e89b-12d3-a456-426614174002 data", async () => {
    db.get.mockResolvedValueOnce({ PK: "HOSP#11111111-1111-1111-1111-111111111111", SK: "BRANCH#33333333-3333-3333-3333-333333333333", status: "ACTIVE" });
    db.update.mockResolvedValueOnce({ name: "Updated Name" });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: "11111111-1111-1111-1111-111111111111", branchId: "33333333-3333-3333-3333-333333333333" },
      body: JSON.stringify({ name: "Updated Name" })
    };
    const res = await updateBranch(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalled();
  });
});
