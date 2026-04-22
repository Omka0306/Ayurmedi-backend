import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn(),
  transactWrite: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { createPatient, getPatient, searchPatients, addHistory, getHistoryList } = await import("../../src/modules/patients/handler.js");
const { generateUHID } = await import("../../src/modules/patients/uhid.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validBranchId = "33333333-3333-3333-3333-333333333333";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validDoctorId = "44444444-4444-4444-4444-444444444444";
const validFormId = "55555555-5555-5555-5555-555555555555";
const validFieldId = "66666666-6666-6666-6666-666666666666";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "HOSPITAL_ADMIN" }
  }
};

describe("patients module", () => {
  beforeEach(() => {
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.scan.mockResolvedValue({ Items: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.get.mockReset();
    db.put.mockReset();
    db.update.mockReset();
    db.query.mockReset();
    db.scan.mockReset();
  });

  it("Register 523e4567-e89b-12d3-a456-426614174004: valid input creates 523e4567-e89b-12d3-a456-426614174004 with UHID and 623e4567-e89b-12d3-a456-426614174005, formData validated against form template", async () => {
    const templateResponse = {
      status: "PUBLISHED",
      sections: [{ fields: [{ fieldId: validFieldId, required: true }] }]
    };
    db.get.mockResolvedValueOnce(templateResponse); // Form Template
    db.get.mockResolvedValueOnce({ hospitalName: "Mitchell" }); // Metadata for UHID
    
    // update: UHID counter + Token counter + Patient insert
    db.update.mockResolvedValueOnce({ seq: 1 }); // UHID
    db.update.mockResolvedValueOnce({ currentToken: 12 }); // Token

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId },
      body: JSON.stringify({
        patientName: "John Mitchell",
        assignedDoctorId: validDoctorId,
        mobileNumber: "9876543210",
        formData: {
          formTemplateId: validFormId,
          formVersion: 1,
          responses: { [validFieldId]: "test" }
        }
      })
    };
    
    const res = await createPatient(event);
    if (res.statusCode !== 201) console.error(res);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    expect(body.data.uhid).toBe(`MIT-${new Date().getFullYear()}-00001`);
    expect(body.data.tokenNumber).toBe(12);
    
    // DB Put checks
    const puts = db.put.mock.calls.map(call => call[0].entityType);
    expect(puts).toContain("PATIENT");
  });

  it("UHID format: MIT-2026-00001, increments correctly, pads to 5 digits", async () => {
    db.get.mockResolvedValueOnce({ hospitalName: "MITCHELL" });
    db.update.mockResolvedValueOnce({ seq: 42 });
    
    const uhid = await generateUHID("123e4567-e89b-12d3-a456-4266141740001");
    expect(uhid).toBe(`MIT-${new Date().getFullYear()}-00042`);
  });

  it("UHID atomic counter: concurrent registrations don't duplicate UHIDs (test with 2 sequential calls)", async () => {
    db.get.mockResolvedValue({ hospitalName: "Alpha Hospital" });
    
    // First call gives seq=1, second call gives seq=2
    db.update
      .mockResolvedValueOnce({ seq: 1 })
      .mockResolvedValueOnce({ seq: 2 });
    
    const uhid1 = await generateUHID("123e4567-e89b-12d3-a456-4266141740001");
    const uhid2 = await generateUHID("123e4567-e89b-12d3-a456-4266141740001");
    
    expect(uhid1).toMatch(/ALP-\d{4}-00001/);
    expect(uhid2).toMatch(/ALP-\d{4}-00002/);
    expect(uhid1).not.toBe(uhid2);
  });

  it("Get 523e4567-e89b-12d3-a456-426614174004: returns correct 523e4567-e89b-12d3-a456-426614174004, wrong hospitalId returns 401", async () => {
    db.get.mockResolvedValueOnce({ patientId: validPatientId, entityType: "PATIENT" });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, branchId: validBranchId, patientId: validPatientId }
    };
    const res = await getPatient(event);
    expect(res.statusCode).toBe(200);
    
    const event403 = {
      ...validCaller,
      pathParameters: { hospitalId: "00000000-0000-0000-0000-000000000000", branchId: validBranchId, patientId: validPatientId }
    };
    const res403 = await getPatient(event403);
    expect(res403.statusCode).toBe(403);
  });

  it("Search by mobile: GSI3 query called with correct key", async () => {
    db.query.mockResolvedValueOnce({ Items: [{ patientId: validPatientId }] });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      queryStringParameters: { q: "9876543210" }
    };
    
    const res = await searchPatients(event);
    if (res.statusCode !== 200) console.error(res);
    expect(res.statusCode).toBe(200);
    
    const queryArgs = db.query.mock.calls[0][0];
    expect(queryArgs.IndexName).toBe("GSI3");
    expect(queryArgs.KeyConditionExpression).toContain("mobileNumber = :mob");
    expect(queryArgs.ExpressionAttributeValues[":mob"]).toBe("9876543210");
  });

  it("Search by name: filter expression includes hospitalId scope", async () => {
    db.scan.mockResolvedValueOnce({ Items: [{ patientId: validPatientId }] });
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      queryStringParameters: { q: "John" }
    };
    const res = await searchPatients(event);
    expect(res.statusCode).toBe(200);
    
    const scanArgs = db.scan.mock.calls[0][0];
    expect(scanArgs.FilterExpression).toContain("hospitalId = :hosp");
    expect(scanArgs.FilterExpression).toContain("contains(patientName, :q)");
  });

  it("Save history: creates PatientHistory record linked to patientId", async () => {
    db.get.mockResolvedValueOnce({
      status: "PUBLISHED",
      sections: [{ fields: [{ fieldId: validFieldId, required: true }] }]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, patientId: validPatientId },
      body: JSON.stringify({
        formData: {
          formTemplateId: validFormId,
          formVersion: 1,
          responses: { [validFieldId]: "answer" }
        }
      })
    };
    
    const res = await addHistory(event);
    expect(res.statusCode).toBe(201);
    
    const putItem = db.put.mock.calls[0][0];
    expect(putItem.entityType).toBe("PATIENT_HISTORY");
    expect(putItem.patientId).toBe(validPatientId);
    expect(putItem.PK).toBe(`PATIENT#${validPatientId}`);
  });

  it("Get history: returns all history entries sorted by date descending", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { historyId: "old", submittedAt: "2026-01-01T00:00:00Z" },
        { historyId: "new", submittedAt: "2026-10-01T00:00:00Z" },
        { historyId: "mid", submittedAt: "2026-05-01T00:00:00Z" }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, patientId: validPatientId }
    };
    
    const res = await getHistoryList(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data[0].historyId).toBe("new");
    expect(body.data[1].historyId).toBe("mid");
    expect(body.data[2].historyId).toBe("old");
  });
});
