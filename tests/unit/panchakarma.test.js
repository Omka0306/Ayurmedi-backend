import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  transactWrite: jest.fn()
}));

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/pk-report.pdf")
}));

jest.unstable_mockModule("../../src/modules/panchakarma/pdfTemplate.js", () => ({
  generatePDFBuffer: jest.fn().mockResolvedValue(Buffer.from("mock pk pdf"))
}));

const db = await import("../../src/common/db.js");
const { 
  createPanchakarma, 
  addSession,
  completePanchakarma,
  getPkReportPdf
} = await import("../../src/modules/panchakarma/handler.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validDoctorId = "44444444-4444-4444-4444-444444444444";
const validBranchId = "33333333-3333-3333-3333-333333333333";
const validPkId = "55555555-5555-5555-5555-555555555555";
const validItemId = "77777777-7777-7777-7777-777777777777";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "DOCTOR" }
  }
};

describe("panchakarma module", () => {
  let presigner;
  let pdfTemplate;

  beforeAll(async () => {
    presigner = await import("@aws-sdk/s3-request-presigner");
    pdfTemplate = await import("../../src/modules/panchakarma/pdfTemplate.js");
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.transactWrite.mockResolvedValue(true);
    presigner.getSignedUrl.mockResolvedValue("https://s3.example.com/pk-report.pdf");
    pdfTemplate.generatePDFBuffer.mockResolvedValue(Buffer.from("mock pk pdf"));
  });

  it("Create plan: saves with PLANNED status, completedSessions=0", async () => {
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId },
      body: JSON.stringify({
        patientId: validPatientId,
        doctorId: validDoctorId,
        hospitalId: validHospitalId,
        branchId: validBranchId,
        procedureType: "BASTI",
        totalSessions: 7,
        startDate: "2026-04-05",
        billingMode: "FULL_COURSE"
      })
    };
    
    const res = await createPanchakarma(event);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("PLANNED");
    expect(body.data.completedSessions).toBe(0);
    expect(db.put).toHaveBeenCalled();
  });

  it("Create session: saves session, deducts inventory for COMPLETED sessions, skips deduction for SKIPPED", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      pkId: validPkId,
      patientId: validPatientId
    });

    const eventCompleted = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      body: JSON.stringify({
        patientId: validPatientId,
        sessionNumber: 1,
        date: "2026-04-05",
        therapistId: validDoctorId,
        status: "COMPLETED",
        materialsUsed: [{
          inventoryItemId: validItemId,
          quantity: 2
        }]
      })
    };

    const resCompleted = await addSession(eventCompleted);
    expect(resCompleted.statusCode).toBe(201);

    const transactArgs = db.transactWrite.mock.calls[0][0];
    expect(transactArgs.TransactItems.length).toBe(4);
    
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      pkId: validPkId,
      patientId: validPatientId
    });

    const eventSkipped = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      body: JSON.stringify({
        patientId: validPatientId,
        sessionNumber: 2,
        date: "2026-04-06",
        therapistId: validDoctorId,
        status: "SKIPPED",
        materialsUsed: [{
          inventoryItemId: validItemId,
          quantity: 2
        }]
      })
    };

    const resSkipped = await addSession(eventSkipped);
    expect(resSkipped.statusCode).toBe(201);
    
    const skippedTransactArgs = db.transactWrite.mock.calls[1][0];
    expect(skippedTransactArgs.TransactItems.length).toBe(1);
  });

  it("Session completion: increments parent plan completedSessions counter atomically", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      pkId: validPkId,
      patientId: validPatientId
    });

    const event = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      body: JSON.stringify({
        patientId: validPatientId,
        sessionNumber: 3,
        date: "2026-04-07",
        therapistId: validDoctorId,
        status: "COMPLETED"
      })
    };

    const res = await addSession(event);
    expect(res.statusCode).toBe(201);

    const transactArgs = db.transactWrite.mock.calls[0][0];
    expect(transactArgs.TransactItems.length).toBe(2);
    expect(transactArgs.TransactItems[1].Update.UpdateExpression).toContain("ADD completedSessions :one");
  });

  it("Insufficient stock on session: returns 409", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      pkId: validPkId,
      patientId: validPatientId
    });

    db.transactWrite.mockRejectedValueOnce(new Error("ConditionalCheckFailed"));
    
    const event = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      body: JSON.stringify({
        patientId: validPatientId,
        sessionNumber: 4,
        date: "2026-04-08",
        therapistId: validDoctorId,
        status: "COMPLETED",
        materialsUsed: [{
          inventoryItemId: validItemId,
          quantity: 500
        }]
      })
    };

    const res = await addSession(event);
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Insufficient inventory");
  });

  it("Complete plan: sets status=COMPLETED", async () => {
    db.query.mockResolvedValueOnce({Items: Array(7).fill({ status: "COMPLETED", hospitalId: validHospitalId }) });
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      patientId: validPatientId,
      pkId: validPkId,
      totalSessions: 7,
      completedSessions: 7 
    });

    const event = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      queryStringParameters: null,
      body: JSON.stringify({
        patientId: validPatientId
      })
    };

    const res = await completePanchakarma(event);
    expect(res.statusCode).toBe(200);
    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("COMPLETED");
  });

  it("PDF report: generates with all sessions, materials summary", async () => {
    db.get.mockResolvedValueOnce({
      hospitalId: validHospitalId,
      patientId: validPatientId,
      pkId: validPkId,
      updatedAt: "2026-04-05T10:00:00Z"
    })
    .mockResolvedValueOnce({ name: "AyurHosp PK" });

    db.query.mockResolvedValueOnce({
      Items: [
        { sessionId: "s1", status: "COMPLETED", materialsUsed: [] },
        { sessionId: "s2", status: "COMPLETED", materialsUsed: [] }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { pkId: validPkId },
      queryStringParameters: { patientId: validPatientId }
    };

    const res = await getPkReportPdf(event);
    expect(res.statusCode).toBe(200);
    
    const body = JSON.parse(res.body);
    expect(body.data.url).toBe("https://s3.example.com/pk-report.pdf");
    expect(pdfTemplate.generatePDFBuffer).toHaveBeenCalled();
  });
});
