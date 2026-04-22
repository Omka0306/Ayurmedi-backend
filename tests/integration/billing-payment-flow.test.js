/**
 * Integration: Billing & Payment Flow
 */
import { jest } from '@jest/globals';
import { createBill, addPayment, getBill } from "../../src/modules/billing/handler.js";

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: () => Promise.resolve("https://mock-s3.com/bill.pdf")
}));
jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: class { send() { return Promise.resolve(true); } },
  PutObjectCommand: class {},
  GetObjectCommand: class {}
}));

const H = "423e4567-e89b-12d3-a456-426614174000";
const PATIENT = "423e4567-e89b-12d3-a456-426614174004";
const CONSULT = "423e4567-e89b-12d3-a456-426614174005";
const BRANCH = "423e4567-e89b-12d3-a456-426614174002";
const INV_ITEM = "423e4567-e89b-12d3-a456-426614174017";
const PK_PLAN = "423e4567-e89b-12d3-a456-426614174016";
const REC = "423e4567-e89b-12d3-a456-426614174015";

const caller = (role = "RECEPTIONIST") => ({
  requestContext: { authorizer: { userId: REC, hospitalId: H, role } }
});

describe("Billing & Payment Flow Integration", () => {
  let billId;

  it("1. Create bill with CONSULTATION + MEDICINE + PANCHAKARMA line items", async () => {
    const res = await createBill({
      ...caller(),
      pathParameters: { patientId: PATIENT },
      body: JSON.stringify({
        patientId: PATIENT,
        hospitalId: H,
        branchId: BRANCH,
        consultId: CONSULT,
        lineItems: [
          { type: "CONSULTATION", description: "First visit", quantity: 1, unitPrice: 500 },
          { type: "MEDICINE", inventoryItemId: INV_ITEM, description: "Meds", quantity: 2, unitPrice: 100 },
          { type: "PANCHAKARMA", pkId: PK_PLAN, description: "Vamana Therapy", quantity: 1, unitPrice: 1500 }
        ],
        discountType: "FIXED",
        discountValue: 200,
        taxRate: 5
      })
    });
    expect(res.statusCode).toBe(201);
    billId = JSON.parse(res.body).data.billId;
    expect(billId).toBeDefined();
  });

  it("2. Verify server-calculated totals", async () => {
    // subtotal = 500 + 200 + 1500 = 2200
    // discount  = 200 (FIXED)
    // taxable   = 2000
    // tax 5%    = 100
    // total     = 2100
    const res = await getBill({
      ...caller(),
      pathParameters: { billId },
      queryStringParameters: { patientId: PATIENT }
    });
    const data = JSON.parse(res.body).data;
    expect(data.subtotal).toBe(2200);
    expect(data.discountAmount).toBe(200);
    expect(data.taxAmount).toBe(100);
    expect(data.totalAmount).toBe(2100);
    expect(data.status).toBe("DRAFT");
  });

  it("3. Partial payment → PARTIALLY_PAID with correct balanceDue", async () => {
    const res = await addPayment({
      ...caller(),
      pathParameters: { billId },
      queryStringParameters: { patientId: PATIENT },
      headers: { "idempotency-key": "ikey-1" },
      body: JSON.stringify({ amount: 1000, mode: "CASH" })
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe("PARTIALLY_PAID");
    expect(data.amountPaid).toBe(1000);
    expect(data.balanceDue).toBe(1100);
  });

  it("4. Remaining payment → status=PAID, balanceDue=0", async () => {
    const res = await addPayment({
      ...caller(),
      pathParameters: { billId },
      queryStringParameters: { patientId: PATIENT },
      headers: { "idempotency-key": "ikey-2" },
      body: JSON.stringify({ amount: 1100, mode: "UPI" })
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe("PAID");
    expect(data.amountPaid).toBe(2100);
    expect(data.balanceDue).toBe(0);
  });

  it("5. Idempotent payment (same key) → no duplicate", async () => {
    const res = await addPayment({
      ...caller(),
      pathParameters: { billId },
      queryStringParameters: { patientId: PATIENT },
      headers: { "idempotency-key": "ikey-2" }, // same key as step 4
      body: JSON.stringify({ amount: 1100, mode: "UPI" })
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    // Total payments array length must still be 2 (not 3)
    expect(data.payments.length).toBe(2);
    expect(data.balanceDue).toBe(0);
  });
});
