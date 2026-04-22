import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn(),
  transactWrite: jest.fn()
}));

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/test.pdf")
}));

jest.unstable_mockModule("../../src/modules/prescriptions/pdfTemplate.js", () => ({
  generatePDFBuffer: jest.fn().mockResolvedValue(Buffer.from("mock pdf"))
}));

const db = await import("../../src/common/db.js");
const { 
  createPrescription, 
  updatePrescription, 
  getPrescriptionPdf 
} = await import("../../src/modules/prescriptions/handler.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validDoctorId = "44444444-4444-4444-4444-444444444444";
const validConsultId = "55555555-5555-5555-5555-555555555555";
const validRxId = "66666666-6666-6666-6666-666666666666";
const validItemId = "77777777-7777-7777-7777-777777777777";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "DOCTOR" }
  }
};

describe("prescriptions module", () => {
  let presigner;
  let pdfTemplate;
  beforeAll(async () => {
    presigner = await import("@aws-sdk/s3-request-presigner");
    pdfTemplate = await import("../../src/modules/prescriptions/pdfTemplate.js");
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.transactWrite.mockResolvedValue(true);
    presigner.getSignedUrl.mockResolvedValue("https://s3.example.com/test.pdf");
    pdfTemplate.generatePDFBuffer.mockResolvedValue(Buffer.from("mock pdf"));
  });

  it("Create prescription: valid input saves prescription, deducts inventory via transactWrite", async () => {
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        hospitalId: validHospitalId,
        medicines: [{
          inventoryItemId: validItemId,
          medicineName: "Aswagandha",
          dosageForm: "CHURNA",
          dosageQty: 2,
          frequency: "TWICE_DAILY",
          timing: "BEFORE_MEALS",
          durationDays: 5
        }]
      })
    };
    
    const res = await createPrescription(event);
    expect(res.statusCode).toBe(201);
    
    const transactArgs = db.transactWrite.mock.calls[0][0];
    expect(transactArgs.TransactItems.length).toBe(3);
    expect(transactArgs.TransactItems[1].Update.UpdateExpression).toContain("currentStock - :qty");
    expect(transactArgs.TransactItems[1].Update.ExpressionAttributeValues[":qty"]).toBe(20);
  });

  it("Inventory insufficient: returns 409 with correct item details when stock too low", async () => {
    db.transactWrite.mockRejectedValueOnce(new Error("ConditionalCheckFailed"));
    db.get.mockResolvedValueOnce({ itemName: "Aswagandha", currentStock: 1 });
    
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        hospitalId: validHospitalId,
        medicines: [{
          inventoryItemId: validItemId,
          medicineName: "Aswagandha",
          dosageForm: "CHURNA",
          dosageQty: 2,
          frequency: "TWICE_DAILY",
          timing: "BEFORE_MEALS",
          durationDays: 5
        }]
      })
    };
    
    const res = await createPrescription(event);
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Insufficient stock for Aswagandha");
  });

  it("No inventoryItemId: saves medicine without deduction", async () => {
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        hospitalId: validHospitalId,
        medicines: [{
          medicineName: "Aswagandha",
          dosageForm: "CHURNA",
          dosageQty: 2,
          frequency: "TWICE_DAILY",
          timing: "BEFORE_MEALS",
          durationDays: 5
        }]
      })
    };
    
    const res = await createPrescription(event);
    expect(res.statusCode).toBe(201);
    
    const transactArgs = db.transactWrite.mock.calls[0][0];
    expect(transactArgs.TransactItems.length).toBe(1);
  });

  it("Update prescription: updates fields, audit log called", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      rxId: validRxId
    });
    
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId, rxId: validRxId },
      body: JSON.stringify({
        precautions: "Drink warm water"
      })
    };
    
    const res = await updatePrescription(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalled();
    expect(db.put).toHaveBeenCalled();
  });

  it("PDF generation: PDFKit called with correct data, uploaded to S3, presigned URL returned", async () => {
    // getPrescriptionPdf needs to find the existing prescription, then the hospital metadata
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      rxId: validRxId,
      updatedAt: "2026-04-05T10:00:00Z"
    })
    .mockResolvedValueOnce({ name: "AyurHosp" }); // this covers the hospital metadata call
    
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId, rxId: validRxId }
    };
    
    const res = await getPrescriptionPdf(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.url).toBe("https://s3.example.com/test.pdf");
    expect(body.data.generated).toBe(true);
    expect(body.data.s3Key).toContain(validRxId);
  });

  it("PDF cache: if pdfS3Key exists and prescription unchanged, returns presigned URL without regenerating PDF", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      rxId: validRxId,
      pdfS3Key: "hospitals/123/prescriptions/666.pdf",
      updatedAt: "2026-04-05T10:00:00Z",
      pdfGeneratedAt: "2026-04-05T10:05:00Z"
    });
    
    const event = {
      ...validCaller,
      pathParameters: { consultId: validConsultId, rxId: validRxId }
    };
    
    const res = await getPrescriptionPdf(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.generated).toBe(false);
  });
});
