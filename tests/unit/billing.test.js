import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn()
}));

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/bill.pdf")
}));

jest.unstable_mockModule("../../src/modules/billing/pdfTemplate.js", () => ({
  generateBillPDF: jest.fn().mockResolvedValue(Buffer.from("mock bill pdf"))
}));

const db = await import("../../src/common/db.js");
const { 
  createBill, 
  getPatientBills,
  addPayment, 
  getBillPdf,
  getBillsSummary
} = await import("../../src/modules/billing/handler.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validPatientId = "22222222-2222-2222-2222-222222222222";
const validBranchId = "33333333-3333-3333-3333-333333333333";
const validBillId = "55555555-5555-5555-5555-555555555555";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "RECEPTIONIST" }
  }
};

const makeLineItems = () => ([
  { type: "CONSULTATION", description: "General Consultation", quantity: 1, unitPrice: 500 },
  { type: "MEDICINE", description: "Aswagandha Churna 100g", quantity: 2, unitPrice: 150 }
]);

describe("billing module", () => {
  let presigner;
  let pdfTemplate;

  beforeAll(async () => {
    presigner = await import("@aws-sdk/s3-request-presigner");
    pdfTemplate = await import("../../src/modules/billing/pdfTemplate.js");
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    presigner.getSignedUrl.mockResolvedValue("https://s3.example.com/bill.pdf");
    pdfTemplate.generateBillPDF.mockResolvedValue(Buffer.from("mock bill pdf"));
  });

  it("Create bill: server calculates totals correctly (PERCENTAGE discount)", async () => {
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId },
      body: JSON.stringify({
        patientId: validPatientId,
        hospitalId: validHospitalId,
        branchId: validBranchId,
        lineItems: makeLineItems(),
        discountType: "PERCENTAGE",
        discountValue: 10,
        taxRate: 5
      })
    };

    const res = await createBill(event);
    expect(res.statusCode).toBe(201);

    const body = JSON.parse(res.body);
    const data = body.data;

    // subtotal = 500 + (2×150) = 800
    expect(data.subtotal).toBe(800);
    // discount = 10% of 800 = 80
    expect(data.discountAmount).toBe(80);
    // taxable = 720; tax = 5% of 720 = 36
    expect(data.taxAmount).toBe(36);
    // total = 720 + 36 = 756
    expect(data.totalAmount).toBe(756);
    expect(data.balanceDue).toBe(756);
    expect(data.amountPaid).toBe(0);
    expect(data.status).toBe("DRAFT");
    expect(db.put).toHaveBeenCalled();
  });

  it("Create bill: FIXED discount correctly bounded by subtotal", async () => {
    const event = {
      ...validCaller,
      pathParameters: { patientId: validPatientId },
      body: JSON.stringify({
        patientId: validPatientId,
        hospitalId: validHospitalId,
        branchId: validBranchId,
        lineItems: [{ type: "CONSULTATION", description: "Consult", quantity: 1, unitPrice: 500 }],
        discountType: "FIXED",
        discountValue: 100,
        taxRate: 0
      })
    };

    const res = await createBill(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.discountAmount).toBe(100);
    expect(body.data.totalAmount).toBe(400);
  });

  it("Add payment: amountPaid recalculated, status → PARTIALLY_PAID when balanceDue > 0", async () => {
    db.get.mockResolvedValueOnce({
      billId: validBillId,
      hospitalId: validHospitalId,
      totalAmount: 756,
      amountPaid: 0,
      balanceDue: 756,
      payments: [],
      status: "ISSUED"
    });
    db.update.mockResolvedValueOnce({
      billId: validBillId, totalAmount: 756, amountPaid: 300, balanceDue: 456, status: "PARTIALLY_PAID", payments: [{ amount: 300 }]
    });

    const event = {
      ...validCaller,
      pathParameters: { billId: validBillId },
      queryStringParameters: { patientId: validPatientId },
      body: JSON.stringify({ amount: 300, mode: "CASH" })
    };

    const res = await addPayment(event);
    expect(res.statusCode).toBe(200);

    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":ap"]).toBe(300);
    expect(updateCall.ExpressionAttributeValues[":bd"]).toBe(456);
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("PARTIALLY_PAID");
  });

  it("Add payment: status → PAID when balanceDue = 0", async () => {
    db.get.mockResolvedValueOnce({
      billId: validBillId,
      hospitalId: validHospitalId,
      totalAmount: 500,
      amountPaid: 0,
      balanceDue: 500,
      payments: [],
      status: "ISSUED"
    });
    db.update.mockResolvedValueOnce({ status: "PAID" });

    const event = {
      ...validCaller,
      pathParameters: { billId: validBillId },
      queryStringParameters: { patientId: validPatientId },
      body: JSON.stringify({ amount: 500, mode: "UPI" })
    };

    const res = await addPayment(event);
    expect(res.statusCode).toBe(200);

    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":bd"]).toBe(0);
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("PAID");
  });

  it("Payment to cancelled bill: returns 409", async () => {
    db.get.mockResolvedValueOnce({
      billId: validBillId,
      hospitalId: validHospitalId,
      totalAmount: 500,
      payments: [],
      status: "CANCELLED"
    });

    const event = {
      ...validCaller,
      pathParameters: { billId: validBillId },
      queryStringParameters: { patientId: validPatientId },
      body: JSON.stringify({ amount: 100, mode: "CASH" })
    };

    const res = await addPayment(event);
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("cancelled");
  });

  it("Idempotent payment: same idempotencyKey returns original response without duplicate", async () => {
    const existingPayment = { paymentId: "pay-1", amount: 300, mode: "CASH", idempotencyKey: "idem-key-123" };
    db.get.mockResolvedValueOnce({
      billId: validBillId,
      hospitalId: validHospitalId,
      totalAmount: 500,
      amountPaid: 300,
      balanceDue: 200,
      payments: [existingPayment],
      status: "PARTIALLY_PAID"
    });

    const event = {
      ...validCaller,
      pathParameters: { billId: validBillId },
      queryStringParameters: { patientId: validPatientId },
      headers: { "idempotency-key": "idem-key-123" },
      body: JSON.stringify({ amount: 300, mode: "CASH" })
    };

    const res = await addPayment(event);
    expect(res.statusCode).toBe(200);
    // DynamoDB update should NOT have been called — returned original
    expect(db.update).not.toHaveBeenCalled();
    const body = JSON.parse(res.body);
    expect(body.data.payments.length).toBe(1);
  });

  it("Revenue summary: correct aggregation by date range and payment mode", async () => {
    db.query.mockResolvedValueOnce({
      Items: [
        {
          entityType: "BILL",
          status: "PAID",
          amountPaid: 500,
          payments: [{ mode: "CASH", amount: 300 }, { mode: "UPI", amount: 200 }]
        },
        {
          entityType: "BILL",
          status: "PARTIALLY_PAID",
          amountPaid: 200,
          payments: [{ mode: "CARD", amount: 200 }]
        },
        {
          entityType: "BILL",
          status: "ISSUED",
          amountPaid: 0,
          payments: []
        }
      ]
    });

    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      queryStringParameters: { from: "2026-04-01", to: "2026-04-30" }
    };

    const res = await getBillsSummary(event);
    expect(res.statusCode).toBe(200);

    const summary = JSON.parse(res.body).data;
    expect(summary.totalBills).toBe(3);
    expect(summary.paidBills).toBe(1);
    expect(summary.pendingBills).toBe(2);
    expect(summary.totalRevenue).toBe(700);
    expect(summary.collectionByMode.cash).toBe(300);
    expect(summary.collectionByMode.upi).toBe(200);
    expect(summary.collectionByMode.card).toBe(200);
  });

  it("PDF generation: generates PDF with correct bill data", async () => {
    db.get.mockResolvedValueOnce({
      billId: validBillId,
      hospitalId: validHospitalId,
      totalAmount: 756,
      updatedAt: "2026-04-05T10:00:00Z",
      lineItems: makeLineItems().map(i => ({ ...i, total: i.quantity * i.unitPrice })),
      payments: []
    })
    .mockResolvedValueOnce({ name: "AyurMedi Hospital" })
    .mockResolvedValueOnce({ name: "Test Patient" });

    const event = {
      ...validCaller,
      pathParameters: { billId: validBillId },
      queryStringParameters: { patientId: validPatientId }
    };

    const res = await getBillPdf(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.url).toBe("https://s3.example.com/bill.pdf");
    expect(body.data.generated).toBe(true);
    expect(pdfTemplate.generateBillPDF).toHaveBeenCalled();
  });
});
