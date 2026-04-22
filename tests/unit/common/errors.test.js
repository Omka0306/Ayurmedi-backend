import { jest } from '@jest/globals';
import { 
  ValidationError, AuthError, ForbiddenError, 
  NotFoundError, ConflictError, DatabaseError 
} from "../../../src/common/errors.js";

describe("errors.js", () => {
  it("ValidationError should have statusCode 400", () => {
    const err = new ValidationError("test");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("test");
  });

  it("AuthError should have statusCode 401", () => {
    const err = new AuthError("test");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_ERROR");
  });

  it("ForbiddenError should have statusCode 403", () => {
    const err = new ForbiddenError("test");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN_ERROR");
  });

  it("NotFoundError should have statusCode 404", () => {
    const err = new NotFoundError("test");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND_ERROR");
  });

  it("ConflictError should have statusCode 409", () => {
    const err = new ConflictError("test");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT_ERROR");
  });

  it("DatabaseError should have statusCode 500", () => {
    const err = new DatabaseError("test");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("DATABASE_ERROR");
  });
});
