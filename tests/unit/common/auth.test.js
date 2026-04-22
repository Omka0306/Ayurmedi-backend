import { jest } from "@jest/globals";

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

const jwt = (await import("jsonwebtoken")).default;
const { authorizer, requireRole, getCallerIdentity } =
  await import("../../../src/common/auth.js");
const { AuthError, ForbiddenError } =
  await import("../../../src/common/errors.js");

describe("auth.js", () => {
  afterEach(() => {
    jwt.verify.mockReset();
  });

  describe("authorizer", () => {
    it("should generate Allow policy for valid token", async () => {
      // Mock synchronous jwt.verify for test mode (when secret is a string)
      jwt.verify.mockReturnValue({
        "custom:hospitalId": "h1",
        "custom:role": "Admin",
        sub: "u1",
      });

      const event = {
        authorizationToken: "Bearer valid_token",
        methodArn:
          "arn:aws:execute-api:ap-south-1:123456789012:api-id/stage/GET/resource",
      };

      const result = await authorizer(event);
      expect(result.principalId).toBe("u1");
      expect(result.policyDocument.Statement[0].Effect).toBe("Allow");
      expect(result.context).toEqual({
        hospitalId: "h1",
        role: "Admin",
        userId: "u1",
      });
    });

    it("should throw Unauthorized wrapper if no token", async () => {
      const event = { authorizationToken: "" };
      await expect(authorizer(event)).rejects.toThrow("Unauthorized");
    });

    it("should throw Unauthorized if verification fails", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });
      const event = { authorizationToken: "Bearer bad_token" };
      await expect(authorizer(event)).rejects.toThrow("Unauthorized");
    });
  });

  describe("getCallerIdentity", () => {
    it("should extract context successfully", () => {
      const event = {
        requestContext: {
          authorizer: { userId: "u1", hospitalId: "h1", role: "Admin" },
        },
      };
      expect(getCallerIdentity(event)).toEqual({
        userId: "u1",
        hospitalId: "h1",
        role: "Admin",
      });
    });

    it("should throw AuthError if missing context", () => {
      const event = { requestContext: {} };
      expect(() => getCallerIdentity(event)).toThrow(AuthError);
    });
  });

  describe("requireRole", () => {
    it("should not throw if role matches", () => {
      const middleware = requireRole(["Admin"]);
      const event = {
        requestContext: {
          authorizer: { userId: "u1", hospitalId: "h1", role: "Admin" },
        },
      };
      expect(() => middleware(event)).not.toThrow();
    });

    it("should throw ForbiddenError if role doesn't match", () => {
      const middleware = requireRole(["Doctor"]);
      const event = {
        requestContext: {
          authorizer: { userId: "u1", hospitalId: "h1", role: "Admin" },
        },
      };
      expect(() => middleware(event)).toThrow(ForbiddenError);
    });
  });
});
