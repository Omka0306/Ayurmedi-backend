import { jest } from '@jest/globals';

jest.unstable_mockModule("../../../src/common/db.js", () => ({
  put: jest.fn()
}));

const db = await import("../../../src/common/db.js");
const { logChange } = await import("../../../src/common/auditLogger.js");

describe("auditLogger.js", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-05T13:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    db.put.mockReset();
  });

  it("logChange should call db.put with properly structured item", () => {
    db.put.mockResolvedValue(true);
    
    logChange({
      entityId: "123",
      entityType: "PATIENT",
      action: "CREATE",
      userId: "u1",
      hospitalId: "h1",
      before: null,
      after: { name: "test" }
    });

    expect(db.put).toHaveBeenCalledTimes(1);
    const calledItem = db.put.mock.calls[0][0];
    
    expect(calledItem).toEqual({
      PK: "AUDIT#123",
      SK: "LOG#2026-04-05T13:00:00.000Z#u1",
      entityId: "123",
      entityType: "PATIENT",
      action: "CREATE",
      userId: "u1",
      hospitalId: "h1",
      before: null,
      after: JSON.stringify({ name: "test" }),
      createdAt: "2026-04-05T13:00:00.000Z"
    });
  });
});
