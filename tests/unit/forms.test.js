import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  transactWrite: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { createForm, updateForm, publishForm, getForm, deleteForm } = await import("../../src/modules/forms/handler.js");
const { getRognpatrakTemplate } = await import("../../src/modules/forms/defaultTemplates.js");
const { createFormSchema } = await import("../../src/modules/forms/validators.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validFormId = "22222222-2222-2222-2222-222222222222";

describe("forms module", () => {
  const validCaller = {
    requestContext: {
      authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "HOSPITAL_ADMIN" }
    }
  };

  beforeEach(() => {
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.transactWrite.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.get.mockReset();
    db.put.mockReset();
    db.update.mockReset();
    db.query.mockReset();
    db.transactWrite.mockReset();
  });

  it("Create form: valid input creates version 1 as DRAFT", async () => {
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      body: JSON.stringify({
        formType: "PATIENT_REGISTRATION",
        name: "Test Form",
        nameMr: "Test Form Mr",
        sections: []
      })
    };
    
    const res = await createForm(event);
    expect(res.statusCode).toBe(201);
    
    expect(db.put).toHaveBeenCalledTimes(3); // form insert + audit log
    const formItem = db.put.mock.calls[0][0];
    expect(formItem.version).toBe(1);
    expect(formItem.status).toBe("DRAFT");
  });

  it("Publish form: changes status to PUBLISHED, archives previous published version", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { formId: validFormId, version: 2, status: "DRAFT" },
        { formId: validFormId, version: 1, status: "PUBLISHED" }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId },
      body: "{}"
    };
    
    const res = await publishForm(event);
    expect(res.statusCode).toBe(200);
    
    expect(db.transactWrite).toHaveBeenCalledTimes(1);
    const transactItems = db.transactWrite.mock.calls[0][0];
    expect(transactItems.length).toBe(2); 
    
    // Check that one sets to published and other to archived
    const puts = transactItems.map(t => t.Update.ExpressionAttributeValues[":published"] || t.Update.ExpressionAttributeValues[":archived"]);
    expect(puts).toContain("PUBLISHED");
    expect(puts).toContain("ARCHIVED");
  });

  it("Update published form: creates new version as DRAFT, does not mutate original", async () => {
    db.query.mockResolvedValueOnce({
        Items: [
            { formId: validFormId, version: 1, status: "PUBLISHED", sections: [] }
        ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId },
      body: JSON.stringify({ name: "Updated Form Name" })
    };
    
    const res = await updateForm(event);
    expect(res.statusCode).toBe(200);
    expect(db.put).toHaveBeenCalledTimes(3); // new draft put + audit log
    
    const formItem = db.put.mock.calls[0][0];
    expect(formItem.version).toBe(2);
    expect(formItem.status).toBe("DRAFT");
  });

  it("Update draft form: updates in place, same version number", async () => {
    db.query.mockResolvedValueOnce({
        Items: [
            { formId: validFormId, version: 2, status: "DRAFT", sections: [] }
        ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId },
      body: JSON.stringify({ name: "Updated Form Name" })
    };
    
    const res = await updateForm(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1); // just native update
  });

  it("Get form: returns latest published version by default, specific version with ?version=N", async () => {
    // published by default
    db.query.mockResolvedValueOnce({
        Items: [
            { formId: validFormId, version: 2, status: "DRAFT" },
            { formId: validFormId, version: 1, status: "PUBLISHED" }
        ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId }
    };
    
    const res = await getForm(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.version).toBe(1);
    
    // specific version
    db.get.mockResolvedValueOnce({ formId: validFormId, version: 2, status: "DRAFT" });
    const eventV2 = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId },
      queryStringParameters: { version: "2" }
    };
    const resV2 = await getForm(eventV2);
    expect(resV2.statusCode).toBe(200);
    const bodyV2 = JSON.parse(resV2.body);
    expect(bodyV2.data.version).toBe(2);
  });

  it("Delete form: sets status to ARCHIVED", async () => {
    db.query.mockResolvedValueOnce({
        Items: [
            { formId: validFormId, version: 2, status: "DRAFT" },
            { formId: validFormId, version: 1, status: "PUBLISHED" }
        ]
    });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, formId: validFormId }
    };
    
    const res = await deleteForm(event);
    expect(res.statusCode).toBe(200);
    
    expect(db.transactWrite).toHaveBeenCalledTimes(1);
    const transactItems = db.transactWrite.mock.calls[0][0];
    expect(transactItems.length).toBe(2);
    expect(transactItems[0].Update.ExpressionAttributeValues[":archived"]).toBe("ARCHIVED");
  });

  it("showIf field: conditional field schema validated correctly", async () => {
    const payload = {
        formType: "PATIENT_REGISTRATION",
        name: "Test conditional schema",
        nameMr: "Test Form Mr",
        sections: [{
            sectionId: validFormId, 
            title: "Sec",
            titleMr: "Sec",
            order: 1,
            fields: [
                {
                   fieldId: validFormId,
                   name: "field1",
                   label: "f1",
                   labelMr: "f1",
                   type: "TEXT",
                   required: false,
                   order: 1,
                   showIf: {
                       fieldId: validFormId,
                       operator: "EQUALS",
                       value: "Yes"
                   }
                }
            ]
        }]
    };
    
    const { error } = createFormSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it("Default template: defaultTemplates.js exports valid Rognpatrak with all 6 sections and correct field types", async () => {
    const template = getRognpatrakTemplate();
    
    expect(template.sections.length).toBe(6);
    expect(template.formType).toBe("PATIENT_HISTORY");
    
    const { error } = createFormSchema.validate({
        formType: template.formType,
        name: template.name,
        nameMr: template.nameMr,
        sections: template.sections
    });
    
    if (error) {
        console.error("Schema validation failed: ", JSON.stringify(error.details, null, 2));
    }
    
    expect(error).toBeUndefined();
  });
});
