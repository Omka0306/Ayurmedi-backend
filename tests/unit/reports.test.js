import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
}));

jest.unstable_mockModule("@aws-sdk/client-sqs", () => ({
  SQSClient: class { send() { return Promise.resolve(true); } },
  SendMessageCommand: class {
    constructor(input) { Object.assign(this, input); }
  }
}));

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/mock-report.pdf")
}));

jest.unstable_mockModule("../../src/modules/reports/templates/fullHistory.js", () => ({
  generateFullHistoryPDF: jest.fn().mockResolvedValue(Buffer.from("mock pdf"))
}));

jest.unstable_mockModule("../../src/modules/reports/templates/visitSummary.js", () => ({
  generateVisitSummaryPDF: jest.fn().mockResolvedValue(Buffer.from("mock pdf"))
}));

jest.unstable_mockModule("../../src/modules/reports/templates/pkSummary.js", () => ({
  generatePkSummaryPDF: jest.fn().mockResolvedValue(Buffer.from("mock pdf"))
}));

jest.unstable_mockModule("../../src/modules/reports/templates/discharge.js", () => ({
  generateDischargePDF: jest.fn().mockResolvedValue(Buffer.from("mock pdf"))
}));

const db = await import("../../src/common/db.js");
const sqs = await import("@aws-sdk/client-sqs");
const fullHistoryTemplate = await import("../../src/modules/reports/templates/fullHistory.js");
const s3Presigner = await import("@aws-sdk/s3-request-presigner");

const { 
  triggerFullHistory, 
  getJobStatus,
  getDailyOpd,
  getRevenueReport,
  getLowStockAlerts
} = await import("../../src/modules/reports/handler.js");

const { handler: reportWorker } = await import("../../src/modules/reports/reportWorker.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validJobId = "55555555-5555-5555-5555-555555555555";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "HOSPITAL_ADMIN" }
  }
};

describe("reports module", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.scan.mockResolvedValue({ Items: [] });
    // Mocking SQS Send locally
    jest.spyOn(sqs.SQSClient.prototype, "send").mockResolvedValue(true);
    
    // Re-mock after resetAllMocks
    s3Presigner.getSignedUrl.mockResolvedValue("https://s3.example.com/mock-report.pdf");
    fullHistoryTemplate.generateFullHistoryPDF.mockResolvedValue(Buffer.from("mock pdf"));
  });

  it("PDF job creation: returns 202 with jobId, SQS message sent with correct params", async () => {
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId }
    };

    const res = await triggerFullHistory(event);
    expect(res.statusCode).toBe(202);
    
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("QUEUED");
    expect(body.data.jobId).toBeDefined();
    
    // Checks that job was saved via DB
    const putCall = db.put.mock.calls[0][0];
    expect(putCall.entityType).toBe("REPORT_JOB");
    expect(putCall.reportType).toBe("FULL_HISTORY");

    // Check SQS call
    expect(sqs.SQSClient.prototype.send).toHaveBeenCalled();
    const command = sqs.SQSClient.prototype.send.mock.calls[0][0];
    const message = JSON.parse(command.MessageBody);
    expect(message.reportType).toBe("FULL_HISTORY");
    expect(message.params.patientId).toBe(validPatientId);
  });

  it("Report worker: fetches all required data, generates PDF, uploads to S3, updates job to COMPLETED", async () => {
    db.get.mockResolvedValueOnce({ firstName: "Test", lastName: "Patient", age: 30 }); // PROFILE
    db.query.mockResolvedValue({ Items: [{ id: "mockConsult" }] }); // Fetch all items dynamically

    const event = {
      Records: [{
        body: JSON.stringify({
          jobId: validJobId,
          hospitalId: validHospitalId,
          callerUserId: "723e4567-e89b-12d3-a456-426614174006",
          reportType: "FULL_HISTORY",
          params: { patientId: validPatientId }
        })
      }]
    };

    await reportWorker(event);

    // Should update to PROCESSING then COMPLETED
    expect(db.update).toHaveBeenCalledTimes(2);
    
    const updateProcessing = db.update.mock.calls[0][0];
    expect(updateProcessing.ExpressionAttributeValues[":status"]).toBe("PROCESSING");
    
    const updateCompleted = db.update.mock.calls[1][0];
    expect(updateCompleted.ExpressionAttributeValues[":status"]).toBe("COMPLETED");
    expect(updateCompleted.ExpressionAttributeValues[":s3Key"]).toBeDefined();
    expect(updateCompleted.ExpressionAttributeValues[":presignedUrl"]).toBeDefined();
    
    // generateFullHistoryPDF called
    expect(fullHistoryTemplate.generateFullHistoryPDF).toHaveBeenCalled();
  });

  it("Report worker error: job status set to FAILED with errorMessage", async () => {
    db.get.mockRejectedValueOnce(new Error("Database fetch error"));

    const event = {
      Records: [{
        body: JSON.stringify({
          jobId: validJobId,
          hospitalId: validHospitalId,
          reportType: "FULL_HISTORY",
          params: { patientId: validPatientId }
        })
      }]
    };

    await expect(reportWorker(event)).rejects.toThrow("Database fetch error");

    // Check update sequences
    expect(db.update).toHaveBeenCalledTimes(2);
    
    const updateFailed = db.update.mock.calls[1][0];
    expect(updateFailed.ExpressionAttributeValues[":status"]).toBe("FAILED");
    expect(updateFailed.ExpressionAttributeValues[":errorMessage"]).toBe("Report generation failed");
  });

  it("Job polling: returns correct status and presignedUrl when COMPLETED", async () => {
    db.get.mockResolvedValueOnce({
      jobId: validJobId,
      hospitalId: validHospitalId,
      status: "COMPLETED",
      presignedUrl: "https://s3.example.com/mock-report.pdf"
    });

    const event = {
      ...validCaller,
      pathParameters: { jobId: validJobId }
    };

    const res = await getJobStatus(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("COMPLETED");
    expect(body.data.presignedUrl).toContain("s3.example.com");
  });

  it("daily-opd: correct consultation count per doctor for given date", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { entityType: "CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-4266141740011" },
        { entityType: "CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-4266141740011" },
        { entityType: "CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-4266141740012" },
        { entityType: "UNRELATED_RECORD" } // Should be filtered out
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      queryStringParameters: { date: "2026-04-05" }
    };

    const res = await getDailyOpd(event);
    expect(res.statusCode).toBe(200);
    
    const data = JSON.parse(res.body).data;
    expect(data.totalConsultations).toBe(3);
    expect(data.perDoctor["223e4567-e89b-12d3-a456-4266141740011"]).toBe(2);
    expect(data.perDoctor["223e4567-e89b-12d3-a456-4266141740012"]).toBe(1);
  });

  it("revenue: correct total and breakdown by payment mode for date range", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        {
          entityType: "BILL",
          payments: [{ mode: "CASH", amount: 500 }, { mode: "UPI", amount: 100 }]
        },
        {
          entityType: "BILL",
          payments: [{ mode: "UPI", amount: 300 }]
        }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      queryStringParameters: { from: "2026-04-01", to: "2026-04-30" }
    };

    const res = await getRevenueReport(event);
    expect(res.statusCode).toBe(200);
    
    const data = JSON.parse(res.body).data;
    expect(data.totalRevenue).toBe(900);
    expect(data.collectionByMode.CASH).toBe(500);
    expect(data.collectionByMode.UPI).toBe(400);
  });

  it("low-stock report: reads from alert records, not a full inventory scan", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        { PK: `ALERT#HOSP#${validHospitalId}`, alertType: "LOW_STOCK" }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId }
    };

    const res = await getLowStockAlerts(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.length).toBe(1);
    
    const queryCall = db.query.mock.calls[0][0];
    expect(queryCall.ExpressionAttributeValues[":pk"]).toBe(`ALERT#HOSP#${validHospitalId}`);
    expect(queryCall.ExpressionAttributeValues[":skPrefix"]).toBe("LOW_STOCK#");
  });
});
