/**
 * Integration: Panchakarma Session Flow
 */
import { jest } from '@jest/globals';
import { createPanchakarma, addSession, updateSession, completePanchakarma } from "../../src/modules/panchakarma/handler.js";
import { createItem, stockIn } from "../../src/modules/inventory/handler.js";
import { get, scan } from "../../src/common/db.js";

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

const H = "323e4567-e89b-12d3-a456-426614174000";
const PATIENT = "323e4567-e89b-12d3-a456-426614174004";
const DOCTOR = "323e4567-e89b-12d3-a456-426614174003";
const BRANCH = "323e4567-e89b-12d3-a456-426614174002";
const ADMIN = "323e4567-e89b-12d3-a456-426614174001";
const THERAPIST = "323e4567-e89b-12d3-a456-426614174020";
const today = new Date().toISOString().split("T")[0];

const caller = (role, userId = DOCTOR) => ({
  requestContext: { authorizer: { userId, hospitalId: H, role } }
});

describe("Panchakarma Session Flow Integration", () => {
  let pkId, sessionId1, sessionId2, sessionId3, itemId;

  beforeAll(async () => {
    const iRes = await createItem({
      ...caller("HOSPITAL_ADMIN", ADMIN),
      pathParameters: { hospitalId: H },
      body: JSON.stringify({
        name: "Mahanarayan Oil", category: "PANCHAKARMA_OIL", unit: "ML",
        purchasePrice: 1, sellingPrice: 2, currentStock: 0, reorderLevel: 500
      })
    });
    expect(iRes.statusCode).toBe(201);
    itemId = JSON.parse(iRes.body).data.itemId;

    const sRes = await stockIn({
      ...caller("HOSPITAL_ADMIN", ADMIN),
      pathParameters: { hospitalId: H, itemId },
      body: JSON.stringify({ quantity: 5000, reason: "Integration seed" })
    });
    // stockIn returns 201 (since it creates a stock transaction)
    expect(sRes.statusCode).toBe(201);
  });

  it("1. Create PK plan for patient", async () => {
    const res = await createPanchakarma({
      ...caller("DOCTOR"),
      pathParameters: { patientId: PATIENT },
      body: JSON.stringify({
        patientId: PATIENT,
        doctorId: DOCTOR,
        hospitalId: H,
        branchId: BRANCH,
        procedureType: "VAMANA",
        totalSessions: 3,
        startDate: today,
        billingMode: "PER_SESSION",
        materialsRequired: [{ inventoryItemId: itemId, itemName: "Mahanarayan Oil", quantity: 200, unit: "ML" }]
      })
    });
    expect(res.statusCode).toBe(201);
    pkId = JSON.parse(res.body).data.pkId;
    expect(pkId).toBeDefined();
  });

  it("2. Add 3 sessions, mark 2 COMPLETED and 1 SKIPPED", async () => {
    const addAndUpdate = async (sessionNumber, status, qty = 200) => {
      const addRes = await addSession({
        ...caller("DOCTOR", THERAPIST),
        pathParameters: { pkId },
        body: JSON.stringify({
          patientId: PATIENT,
          sessionNumber,
          date: today,
          therapistId: THERAPIST,
          status,
          materialsUsed: [{ inventoryItemId: itemId, itemName: "Mahanarayan Oil", quantity: qty, unit: "ML" }]
        })
      });
      expect(addRes.statusCode).toBe(201);
      return JSON.parse(addRes.body).data.sessionId;
    };

    sessionId1 = await addAndUpdate(1, "COMPLETED", 200);
    sessionId2 = await addAndUpdate(2, "SKIPPED", 0);
    sessionId3 = await addAndUpdate(3, "COMPLETED", 250);
  });

  it("3. Verify completedSessions counter = 2 on parent plan", async () => {
    const plan = await get({ Key: { PK: `PATIENT#${PATIENT}`, SK: `PK#${pkId}` } });
    expect(plan).toBeDefined();
    expect(plan.completedSessions).toBe(2);
  });

  it("4. Verify inventory deducted only for COMPLETED sessions (200 + 250 = 450)", async () => {
    const item = await get({ Key: { PK: `HOSP#${H}`, SK: `INV#${itemId}` } });
    // Started with 5000. Deducted 450 (COMPLETED only). SKIPPED deducts 0.
    expect(item.currentStock).toBe(4550);
  });

  it("5. Complete PK plan", async () => {
    const res = await completePanchakarma({
      ...caller("DOCTOR"),
      pathParameters: { pkId },
      body: JSON.stringify({ patientId: PATIENT })
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe("COMPLETED");
  });
});
