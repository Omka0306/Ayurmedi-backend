/**
 * Integration: Consultation to Prescription Flow
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

jest.unstable_mockModule("ioredis", () => ({
  default: class {
    constructor() {}
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve("OK"); }
    on() { return this; }
    disconnect() { return Promise.resolve(); }
  }
}));

const { createConsultation, updateConsultation, completeConsultation } = await import("../../src/modules/consultations/handler.js");
const { createPrescription } = await import("../../src/modules/prescriptions/handler.js");
const { createItem, stockIn } = await import("../../src/modules/inventory/handler.js");
const { get, scan, put } = await import("../../src/common/db.js");

const today = new Date().toISOString().split("T")[0];

const H = "223e4567-e89b-12d3-a456-426614174000";
const PATIENT = "223e4567-e89b-12d3-a456-426614174004";
const DOCTOR = "223e4567-e89b-12d3-a456-426614174003";
const BRANCH = "223e4567-e89b-12d3-a456-426614174002";
const ADMIN = "223e4567-e89b-12d3-a456-426614174001";

const caller = (role, userId = DOCTOR) => ({
  requestContext: { authorizer: { userId, hospitalId: H, role } }
});

describe("Consultation to Prescription Flow Integration", () => {
  let consultId, itemId;

  beforeAll(async () => {
    await put({
      PK: `HOSP#${H}#BRANCH#${BRANCH}#DATE#${today}`,
      SK: `TOKEN#SOME_TOKEN`,
      "GSI1-PK": `DOCTOR#${DOCTOR}`,
      "GSI1-SK": `STATUS#WAITING`,
      entityType: "TOKEN",
      tokenId: "SOME_TOKEN",
      hospitalId: H,
      branchId: BRANCH,
      doctorId: DOCTOR,
      status: "WAITING",
      createdAt: today
    });

    const iRes = await createItem({
      ...caller("HOSPITAL_ADMIN", ADMIN),
      pathParameters: { hospitalId: H },
      body: JSON.stringify({
        name: "IntMedicine", category: "PROPRIETARY", unit: "TABLET",
        purchasePrice: 80, sellingPrice: 100, currentStock: 0, reorderLevel: 2
      })
    });
    expect(iRes.statusCode).toBe(201);
    itemId = JSON.parse(iRes.body).data.itemId;

    const sRes = await stockIn({
      ...caller("HOSPITAL_ADMIN", ADMIN),
      pathParameters: { hospitalId: H, itemId },
      body: JSON.stringify({ quantity: 50, reason: "Integration seed" })
    });
    expect(sRes.statusCode).toBe(201);
  });

  it("1. Create consultation → verify linked", async () => {
    const res = await createConsultation({
      ...caller("DOCTOR"),
      pathParameters: { patientId: PATIENT },
      body: JSON.stringify({
        doctorId: DOCTOR,
        hospitalId: H,
        branchId: BRANCH,
        tokenId: "SOME_TOKEN",
        chiefComplaint: "Headache and fever"
      })
    });
    expect(res.statusCode).toBe(201);
    consultId = JSON.parse(res.body).data.consultId;
    expect(consultId).toBeDefined();
  });

  it("2. Update consultation with clinical examination data", async () => {
    const res = await updateConsultation({
      ...caller("DOCTOR"),
      pathParameters: { patientId: PATIENT, consultId },
      body: JSON.stringify({
        clinicalExamination: {
          vitalSigns: { bp: "120/80", pulse: 72 },
          ayurvedicDiagnosis: { dosha: { vata: true }, treatmentPrinciple: "Vata pacification" }
        }
      })
    });
    expect(res.statusCode).toBe(200);
  });

  it("3. Complete consultation → verify status=COMPLETED", async () => {
    const res = await completeConsultation({
      ...caller("DOCTOR"),
      pathParameters: { patientId: PATIENT, consultId }
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe("COMPLETED");
  });

  it("4. Create prescription with medicines → verify inventory deducted", async () => {
    const res = await createPrescription({
      ...caller("DOCTOR"),
      pathParameters: { consultId },
      body: JSON.stringify({
        patientId: PATIENT,
        doctorId: DOCTOR,
        hospitalId: H,
        medicines: [{
          inventoryItemId: itemId,
          medicineName: "IntMedicine",
          dosageForm: "TABLET",
          dosageQty: 1,
          frequency: "TWICE_DAILY",
          timing: "AFTER_MEALS",
          durationDays: 5
        }]
      })
    });
    expect(res.statusCode).toBe(201);
  });

  it("5. Verify StockTransaction records created and inventory deducted", async () => {
    // 1 tablet * TWICE_DAILY (×2) * 5 days = 10 tablets
    const item = await get({ Key: { PK: `HOSP#${H}`, SK: `INV#${itemId}` } });
    expect(item.currentStock).toBe(40); // 50 - 10 = 40

    const allItems = (await scan({})).Items;
    const txns = allItems.filter(i => i.type === "STOCK_OUT" && i.itemId === itemId);
    expect(txns.length).toBeGreaterThan(0);
  });
});
