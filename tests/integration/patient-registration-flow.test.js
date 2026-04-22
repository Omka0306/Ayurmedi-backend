/**
 * Integration: Patient Registration Flow
 * Seed: hospital METADATA + PUBLISHED FORM + UHID counter
 * Tests branch creation, doctor registration, patient registration with UHID + token.
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

const { createBranch } = await import("../../src/modules/branches/handler.js");
const { createDoctor } = await import("../../src/modules/doctors/handler.js");
const { createPatient } = await import("../../src/modules/patients/handler.js");
const { get, put } = await import("../../src/common/db.js");

const H = "123e4567-e89b-12d3-a456-426614174000";
const ADMIN = "123e4567-e89b-12d3-a456-426614174001";
const DOC_USER = "123e4567-e89b-12d3-a456-426614174003";
const FORM_ID = "123e4567-e89b-12d3-a456-426614174099";
const SEC_ID = "123e4567-e89b-12d3-a456-426614174090";
const FIELD_ID = "123e4567-e89b-12d3-a456-426614174091";

const caller = (role, userId = ADMIN) => ({
  requestContext: { authorizer: { userId, hospitalId: H, role } }
});

describe("Patient Registration Flow Integration", () => {
  let branchId, doctorId, patientId, uhid;

  beforeAll(async () => {
    // Seed hospital metadata (required by generateUHID)
    await put({
      PK: `HOSP#${H}`,
      SK: "METADATA",
      entityType: "HOSPITAL",
      hospitalId: H,
      hospitalName: "AyurMedi Global"
    });

    // Seed a published form template (required by createPatient)
    await put({
      PK: `HOSP#${H}`,
      SK: `FORM#${FORM_ID}#V1`,
      entityType: "FORM_VERSION",
      formId: FORM_ID,
      hospitalId: H,
      formType: "PATIENT_REGISTRATION",
      version: 1,
      status: "PUBLISHED",
      sections: [{
        sectionId: SEC_ID,
        fields: [{ fieldId: FIELD_ID, required: false }]
      }]
    });
  });

  it("1. Create branch", async () => {
    const res = await createBranch({
      ...caller("HOSPITAL_ADMIN"),
      pathParameters: { hospitalId: H },
      body: JSON.stringify({
        name: "Main Branch",
        address: { line1: "123 Main St", city: "Mumbai", state: "MH", zip: "400001" },
        phone: "9999999990"
      })
    });
    expect(res.statusCode).toBe(201);
    branchId = JSON.parse(res.body).data.branchId;
    expect(branchId).toBeDefined();
  });

  it("2. Register doctor", async () => {
    const res = await createDoctor({
      ...caller("HOSPITAL_ADMIN"),
      pathParameters: { hospitalId: H },
      body: JSON.stringify({
        userId: DOC_USER,
        branchIds: [branchId],
        name: "Dr. Smith",
        specialization: "General Ayurveda",
        registrationNumber: "MH-12345"
      })
    });
    expect(res.statusCode).toBe(201);
    doctorId = JSON.parse(res.body).data.doctorId;
    expect(doctorId).toBeDefined();
  });

  it("3. Register patient → UHID generated, token created", async () => {
    const res = await createPatient({
      ...caller("RECEPTIONIST"),
      pathParameters: { hospitalId: H, branchId },
      body: JSON.stringify({
        patientName: "John Doe",
        assignedDoctorId: doctorId,
        mobileNumber: "9988776655",
        formData: {
          formTemplateId: FORM_ID,
          formVersion: 1,
          responses: {}
        }
      })
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    patientId = data.patientId;
    uhid = data.uhid;
    expect(patientId).toBeDefined();
    expect(uhid).toBeDefined();
    expect(data.tokenNumber).toBeGreaterThan(0);
  });

  it("4. Verify DynamoDB has correct PK/SK for patient record", async () => {
    // Patient stored under branch PK
    const patientItem = await get({ PK: `HOSP#${H}#BRANCH#${branchId}`, SK: `PATIENT#${patientId}` });
    expect(patientItem).toBeDefined();
    expect(patientItem.uhid).toBe(uhid);
    expect(patientItem.patientName).toBe("John Doe");
  });

  it("5. Verify UHID counter incremented", async () => {
    const year = new Date().getFullYear();
    const counter = await get({ PK: `COUNTER#HOSP#${H}`, SK: `YEAR#${year}` });
    expect(counter).toBeDefined();
    expect(counter.seq).toBeGreaterThan(0);
  });
});
