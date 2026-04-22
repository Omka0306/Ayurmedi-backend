import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get, put, update, query } from "../../common/db.js";
import { AuthError, NotFoundError, ConflictError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { generateBillPDF } from "./pdfTemplate.js";

const s3Client = new S3Client({});
const getBucket = () => process.env.DOCUMENTS_BUCKET || "ayurmedi-documents-dev";

// ─── Server-side total calculations ────────────────────────────────────────
const computeTotals = (lineItems, discountType, discountValue, taxRate) => {
  const enriched = lineItems.map(item => ({
    ...item,
    lineItemId: item.lineItemId || uuidv4(),
    total: Math.round(item.quantity * item.unitPrice * 100) / 100
  }));

  const subtotal = enriched.reduce((sum, i) => sum + i.total, 0);

  let discountAmount = 0;
  if (discountType === "PERCENTAGE" && discountValue) {
    discountAmount = Math.round(subtotal * (discountValue / 100) * 100) / 100;
  } else if (discountType === "FIXED" && discountValue) {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const taxable = subtotal - discountAmount;
  const rate = taxRate || 0;
  const taxAmount = Math.round(taxable * (rate / 100) * 100) / 100;
  const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;

  return { lineItems: enriched, subtotal, discountAmount, taxAmount, totalAmount };
};

// ─── Create Bill ────────────────────────────────────────────────────────────
export const createBill = async (caller, patientId, data) => {
  if (caller.hospitalId !== data.hospitalId) throw new AuthError("Access denied");

  const billId = uuidv4();
  const billDate = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString();

  const { lineItems, subtotal, discountAmount, taxAmount, totalAmount } =
    computeTotals(data.lineItems, data.discountType, data.discountValue, data.taxRate);

  const bill = {
    PK: `PATIENT#${patientId}`,
    SK: `BILL#${billId}`,
    "GSI1-PK": `HOSP#${data.hospitalId}`,
    "GSI1-SK": `DATE#${billDate}`,
    entityType: "BILL",
    billId,
    patientId,
    hospitalId: data.hospitalId,
    branchId: data.branchId,
    consultId: data.consultId || null,
    billDate,
    lineItems,
    subtotal,
    discountType: data.discountType || null,
    discountValue: data.discountValue || 0,
    discountAmount,
    taxRate: data.taxRate || 0,
    taxAmount,
    totalAmount,
    payments: [],
    amountPaid: 0,
    balanceDue: totalAmount,
    status: "DRAFT",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(bill);
  await logChange({ entityId: billId, entityType: "BILL", action: "CREATE", userId: caller.userId, hospitalId: caller.hospitalId, before: null, after: bill });
  return bill;
};

// ─── Get Bills for Patient ──────────────────────────────────────────────────
export const getPatientBills = async (caller, patientId) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `PATIENT#${patientId}`, ":skPrefix": "BILL#" }
  });
  const items = result.Items || [];
  return items.filter(b => b.hospitalId === caller.hospitalId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ─── Get Single Bill ────────────────────────────────────────────────────────
export const getBill = async (caller, patientId, billId) => {
  const bill = await get({ PK: `PATIENT#${patientId}`, SK: `BILL#${billId}` });
  if (!bill) throw new NotFoundError("Bill not found");
  if (bill.hospitalId !== caller.hospitalId) throw new AuthError("Access denied");
  return bill;
};

// Helper: find bill by billId alone (requires patientId in path on most routes)
export const getBillByIdAndPatient = getBill;

// ─── Update Bill ────────────────────────────────────────────────────────────
export const updateBill = async (caller, patientId, billId, data) => {
  const bill = await getBill(caller, patientId, billId);
  if (bill.status === "CANCELLED") throw new ConflictError("Cannot modify a cancelled bill");
  if (bill.status === "PAID") throw new ConflictError("Cannot modify a fully paid bill");

  const timestamp = new Date().toISOString();
  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const names = {};
  const vals = { ":ts": timestamp, ":ub": caller.userId };

  if (data.status !== undefined) {
    updateExp += ", #st = :status";
    names["#st"] = "status";
    vals[":status"] = data.status;
  }

  if (data.lineItems) {
    const { lineItems, subtotal, discountAmount, taxAmount, totalAmount } =
      computeTotals(data.lineItems, data.discountType ?? bill.discountType, data.discountValue ?? bill.discountValue, data.taxRate ?? bill.taxRate);
    updateExp += ", lineItems = :li, subtotal = :sub, discountAmount = :da, taxAmount = :ta, totalAmount = :tot, balanceDue = :bd";
    vals[":li"] = lineItems;
    vals[":sub"] = subtotal;
    vals[":da"] = discountAmount;
    vals[":ta"] = taxAmount;
    vals[":tot"] = totalAmount;
    vals[":bd"] = Math.max(0, totalAmount - bill.amountPaid);
  }

  const updatedBill = await update({
    PK: `PATIENT#${patientId}`,
    SK: `BILL#${billId}`,
    UpdateExpression: updateExp,
    ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
    ExpressionAttributeValues: vals,
    ReturnValues: "ALL_NEW"
  });

  await logChange({ entityId: billId, entityType: "BILL", action: "UPDATE", userId: caller.userId, hospitalId: caller.hospitalId, before: bill, after: updatedBill });
  return updatedBill;
};

// ─── Add Payment ────────────────────────────────────────────────────────────
export const addPayment = async (caller, patientId, billId, data, idempotencyKey) => {
  const bill = await getBill(caller, patientId, billId);
  if (bill.status === "CANCELLED") throw new ConflictError("Cannot add payment to a cancelled bill");

  // Idempotency check
  if (idempotencyKey) {
    const existing = (bill.payments || []).find(p => p.idempotencyKey === idempotencyKey);
    if (existing) return bill; // Return original bill unchanged
  }

  const paymentId = uuidv4();
  const timestamp = new Date().toISOString();
  const payment = {
    paymentId,
    amount: data.amount,
    mode: data.mode,
    paidAt: data.paidAt || timestamp,
    reference: data.reference || "",
    idempotencyKey: idempotencyKey || null
  };

  const payments = [...(bill.payments || []), payment];
  const amountPaid = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((bill.totalAmount - amountPaid) * 100) / 100);
  const status = balanceDue === 0 ? "PAID" : "PARTIALLY_PAID";

  const updatedBill = await update({
    PK: `PATIENT#${patientId}`,
    SK: `BILL#${billId}`,
    UpdateExpression: "SET payments = :payments, amountPaid = :ap, balanceDue = :bd, #st = :status, updatedAt = :ts, updatedBy = :ub",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: {
      ":payments": payments,
      ":ap": amountPaid,
      ":bd": balanceDue,
      ":status": status,
      ":ts": timestamp,
      ":ub": caller.userId
    },
    ReturnValues: "ALL_NEW"
  });

  await logChange({ entityId: billId, entityType: "BILL", action: "PAYMENT", userId: caller.userId, hospitalId: caller.hospitalId, before: bill, after: updatedBill });
  return updatedBill;
};

// ─── Bills Summary ──────────────────────────────────────────────────────────
export const getBillsSummary = async (caller, hospitalId, from, to) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const result = await query({
    IndexName: "GSI1",
    KeyConditionExpression: "#pk = :hosp AND #sk BETWEEN :from AND :to",
    ExpressionAttributeNames: { "#pk": "GSI1-PK", "#sk": "GSI1-SK" },
    ExpressionAttributeValues: {
      ":hosp": `HOSP#${hospitalId}`,
      ":from": `DATE#${from}`,
      ":to": `DATE#${to}`
    }
  });

  const bills = (result.Items || []).filter(b => b.entityType === "BILL");

  const totalRevenue = bills.reduce((s, b) => s + (b.amountPaid || 0), 0);
  const totalBills = bills.length;
  const paidBills = bills.filter(b => b.status === "PAID").length;
  const pendingBills = bills.filter(b => ["DRAFT", "ISSUED", "PARTIALLY_PAID"].includes(b.status)).length;

  const collectionByMode = { cash: 0, upi: 0, card: 0 };
  for (const bill of bills) {
    for (const payment of bill.payments || []) {
      const mode = payment.mode?.toLowerCase();
      if (collectionByMode[mode] !== undefined) {
        collectionByMode[mode] += payment.amount;
      }
    }
  }

  return { totalRevenue, totalBills, paidBills, pendingBills, collectionByMode };
};

// ─── PDF Generation ─────────────────────────────────────────────────────────
export const getBillPdf = async (caller, patientId, billId) => {
  const bill = await getBill(caller, patientId, billId);
  const hospital = await get({ PK: `HOSP#${caller.hospitalId}`, SK: "METADATA" });
  const patient = await get({ PK: `PATIENT#${patientId}`, SK: "PROFILE" });

  const s3Key = `hospitals/${caller.hospitalId}/bills/${billId}.pdf`;
  const generateNew = !bill.pdfS3Key || !bill.pdfGeneratedAt || new Date(bill.updatedAt) > new Date(bill.pdfGeneratedAt);

  if (generateNew) {
    const pdfBuffer = await generateBillPDF(bill, hospital || {}, patient || {});
    await s3Client.send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: "application/pdf"
    }));
    const timestamp = new Date().toISOString();
    await update({
      PK: `PATIENT#${patientId}`,
      SK: `BILL#${billId}`,
      UpdateExpression: "SET pdfS3Key = :k, pdfGeneratedAt = :ts",
      ExpressionAttributeValues: { ":k": s3Key, ":ts": timestamp }
    });
  }

  const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: getBucket(), Key: s3Key }), { expiresIn: 900 });
  return { url, generated: generateNew, s3Key };
};
