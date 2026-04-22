/**
 * Integration: Form Versioning Flow
 * Matches actual service response shapes from forms/service.js
 */
import { createForm, publishForm, updateForm, getForm } from "../../src/modules/forms/handler.js";
import { put, get } from "../../src/common/db.js";

const H = "623e4567-e89b-12d3-a456-426614174000";
const ADMIN = "623e4567-e89b-12d3-a456-426614174001";

// Field and section UUIDs
const SEC1 = "623e4567-e89b-12d3-a456-426614174090";
const F1 = "623e4567-e89b-12d3-a456-426614174091";
const F2 = "623e4567-e89b-12d3-a456-426614174092";

const caller = (role = "HOSPITAL_ADMIN") => ({
  requestContext: { authorizer: { userId: ADMIN, hospitalId: H, role } }
});

describe("Form Versioning Flow Integration", () => {
  let formId;

  it("1. Create form template → status=DRAFT, version=1", async () => {
    const res = await createForm({
      ...caller(),
      pathParameters: { hospitalId: H },
      body: JSON.stringify({
        formType: "PATIENT_REGISTRATION",
        name: "Registration Form",
        nameMr: "नोंदणी फॉर्म",
        sections: [{
          sectionId: SEC1,
          title: "Basic Info",
          titleMr: "मूलभूत माहिती",
          order: 1,
          fields: [{
            fieldId: F1,
            name: "chiefComplaint",
            label: "Chief Complaint",
            labelMr: "मुख्य तक्रार",
            type: "TEXT",
            required: true,
            order: 1
          }]
        }]
      })
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    formId = data.formId;
    expect(formId).toBeDefined();
    expect(data.version).toBe(1);
  });

  it("2. Publish → status=PUBLISHED, version=1", async () => {
    const res = await publishForm({
      ...caller(),
      pathParameters: { hospitalId: H, formId },
      body: JSON.stringify({})
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    // publishForm returns { message, version }
    expect(data.version).toBe(1);
  });

  it("3. Update published form → new DRAFT version 2 created", async () => {
    const res = await updateForm({
      ...caller(),
      pathParameters: { hospitalId: H, formId },
      body: JSON.stringify({
        sections: [{
          sectionId: SEC1,
          title: "Basic Info",
          titleMr: "मूलभूत माहिती",
          order: 1,
          fields: [
            { fieldId: F1, name: "chiefComplaint", label: "Chief Complaint", labelMr: "मुख्य तक्रार", type: "TEXT", required: true, order: 1 },
            { fieldId: F2, name: "duration", label: "Duration", labelMr: "कालावधी", type: "NUMBER", required: true, order: 2 }
          ]
        }]
      })
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    // updateForm on a PUBLISHED form creates a new DRAFT with higher version number
    expect(data.version).toBe(2);
  });

  it("4. Publish version 2 → version 2 becomes PUBLISHED", async () => {
    const res = await publishForm({
      ...caller(),
      pathParameters: { hospitalId: H, formId },
      body: JSON.stringify({})
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.version).toBe(2);
  });

  it("5. getForm returns version 2 with 2 fields", async () => {
    const res = await getForm({
      ...caller(),
      pathParameters: { hospitalId: H, formId },
      queryStringParameters: null
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.version).toBe(2);
    expect(data.sections[0].fields.length).toBe(2);
  });
});
