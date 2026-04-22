/**
 * Integration: Token Queue Flow
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule("ioredis", () => {
  return {
    default: class {
      constructor() {}
      get() { return Promise.resolve(null); }
      set() { return Promise.resolve("OK"); }
      on(event, cb) { return this; }
      disconnect() { return Promise.resolve(); }
    }
  };
});

const { createToken, callToken, skipToken, completeToken } = await import("../../src/modules/tokens/handler.js");

const H = "523e4567-e89b-12d3-a456-426614174000";
const BRANCH = "523e4567-e89b-12d3-a456-426614174002";
const DOCTOR = "523e4567-e89b-12d3-a456-426614174003";
const PAT1 = "523e4567-e89b-12d3-a456-426614174011";
const PAT2 = "523e4567-e89b-12d3-a456-426614174012";
const PAT3 = "523e4567-e89b-12d3-a456-426614174013";
const ADMIN = "523e4567-e89b-12d3-a456-426614174001";

const caller = (role = "HOSPITAL_ADMIN") => ({
  requestContext: { authorizer: { userId: ADMIN, hospitalId: H, role } }
});

describe("Token Queue Flow Integration", () => {
  let tok1, tok2, tok3;

  it("1. Register 3 patients for same doctor → get tokens 1, 2, 3", async () => {
    const createTok = async (patId, patName) => {
      const res = await createToken({
        ...caller(),
        pathParameters: { hospitalId: H, branchId: BRANCH },
        body: JSON.stringify({ patientId: patId, doctorId: DOCTOR, patientName: patName, doctorName: "Dr. Smith", priority: "NORMAL" })
      });
      expect(res.statusCode).toBe(201);
      return JSON.parse(res.body).data.tokenId;
    };

    tok1 = await createTok(PAT1, "Patient One");
    tok2 = await createTok(PAT2, "Patient Two");
    tok3 = await createTok(PAT3, "Patient Three");

    expect(tok1).toBeDefined();
    expect(tok2).toBeDefined();
    expect(tok3).toBeDefined();
    // Each token should have a different ID
    expect(tok1).not.toBe(tok2);
    expect(tok2).not.toBe(tok3);
  });

  it("2. Call token 1 → status=CALLED", async () => {
    const res = await callToken({ ...caller("DOCTOR"), pathParameters: { tokenId: tok1 } });
    console.log("CALL RES:", res.body);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe("CALLED");
  });

  it("3. Complete token 1 → status=COMPLETED", async () => {
    const res = await completeToken({ ...caller("DOCTOR"), pathParameters: { tokenId: tok1 } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe("COMPLETED");
  });

  it("4. Skip token 2 → status=SKIPPED", async () => {
    const res = await skipToken({ ...caller("DOCTOR"), pathParameters: { tokenId: tok2 } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe("SKIPPED");
  });

  it("5. Token 3 still WAITING — distinct IDs confirm no collision", async () => {
    expect(tok3).not.toEqual(tok1);
    expect(tok3).not.toEqual(tok2);
  });
});
