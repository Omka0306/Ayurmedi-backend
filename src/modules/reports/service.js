import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import { put, get, query, scan } from "../../common/db.js";
import { AuthError, NotFoundError } from "../../common/errors.js";

const sqsClient = new SQSClient({});
const getQueueUrl = () => process.env.REPORT_QUEUE_URL || "dummy-queue-url";

// ─── Async Report Publishers ────────────────────────────────────────────────
export const requestPatientReport = async (caller, hospitalId, params, reportType) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const jobId = uuidv4();
  const timestamp = new Date().toISOString();

  const jobRecord = {
    PK: `JOB#${jobId}`,
    SK: "METADATA",
    entityType: "REPORT_JOB",
    jobId,
    hospitalId,
    reportType,
    params,
    status: "QUEUED",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId
  };

  await put(jobRecord);

  // Send message to SQS worker
  const payload = {
    jobId,
    hospitalId,
    callerUserId: caller.userId,
    reportType,
    params
  };

  if (process.env.IS_OFFLINE) {
    console.log("[Offline Mode] SQS Message bypass: ", payload);
  } else {
    try {
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: getQueueUrl(),
        MessageBody: JSON.stringify(payload)
      }));
    } catch (err) {
      console.warn("Failed to invoke SQS. Is REDRIVE configured?", err);
    }
  }

  return {
    jobId,
    status: "QUEUED",
    pollUrl: `/reports/jobs/${jobId}`
  };
};

export const getJobStatus = async (caller, jobId) => {
  const job = await get({ PK: `JOB#${jobId}`, SK: "METADATA" });
  if (!job) throw new NotFoundError("Job not found");
  if (job.hospitalId !== caller.hospitalId) throw new AuthError("Access denied");

  return {
    jobId: job.jobId,
    status: job.status,
    presignedUrl: job.presignedUrl || null,
    errorMessage: job.errorMessage || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
};

// ─── Admin Sync Reports ─────────────────────────────────────────────────────

export const getDailyOpd = async (caller, hospitalId, date) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  // Consultations are generally stored with PATIENT# PK.
  // GSI2: PK=hospitalId, SK=createdAt
  const result = await query({
    IndexName: "GSI2",
    KeyConditionExpression: "hospitalId = :hosp AND begins_with(createdAt, :date)",
    ExpressionAttributeValues: { ":hosp": hospitalId, ":date": date }
  });

  const consults = (result.Items || []).filter(i => i.entityType === "CONSULTATION");
  const doctorLoad = {};
  for (const c of consults) {
    if (!doctorLoad[c.doctorId]) doctorLoad[c.doctorId] = 0;
    doctorLoad[c.doctorId]++;
  }

  return { date, totalConsultations: consults.length, perDoctor: doctorLoad };
};

export const getRevenueReport = async (caller, hospitalId, fromDate, toDate) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  
  // GSI1 of BILL: PK=HOSP#Id, SK=DATE#date
  const result = await query({
    IndexName: "GSI1",
    KeyConditionExpression: "#pk = :hosp AND #sk BETWEEN :from AND :to",
    ExpressionAttributeNames: { "#pk": "GSI1-PK", "#sk": "GSI1-SK" },
    ExpressionAttributeValues: {
      ":hosp": `HOSP#${hospitalId}`,
      ":from": `DATE#${fromDate}`,
      ":to": `DATE#${toDate}`
    }
  });

  const bills = (result.Items || []).filter(b => b.entityType === "BILL");
  const collectionByMode = {};
  let totalRevenue = 0;

  for (const bill of bills) {
    for (const payment of bill.payments || []) {
      const mode = payment.mode || "UNKNOWN";
      if (!collectionByMode[mode]) collectionByMode[mode] = 0;
      collectionByMode[mode] += payment.amount;
      totalRevenue += payment.amount;
    }
  }

  return { fromDate, toDate, totalRevenue, collectionByMode, totalBills: bills.length };
};

export const getInventoryUsage = async (caller, hospitalId, fromDate, toDate) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  
  // Transactions are PK=INV#itemId, SK=TXN#txnId. To get hospital-wide by date, scan or GSI.
  // Assuming volume is moderate for scanning or just scan INVENTORY_ITEM and grab txns.
  // Actually, we can fetch all transactions in date range if we had a GSI. Since we don't have a GSI on transaction date, it's a scan.
  const result = await scan({
    FilterExpression: "hospitalId = :hosp AND entityType = :et AND type = :out AND performedAt >= :from AND performedAt <= :to",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: {
      ":hosp": hospitalId,
      ":et": "STOCK_TRANSACTION",
      ":out": "STOCK_OUT",
      ":from": fromDate, 
      ":to": toDate + "T23:59:59.999Z"
    }
  });

  const txns = result.Items || [];
  const usageMap = {};
  txns.forEach(t => {
    if (!usageMap[t.itemId]) usageMap[t.itemId] = 0;
    usageMap[t.itemId] += t.quantity;
  });

  return { fromDate, toDate, usageByItemId: usageMap, totalTransactions: txns.length };
};

export const getDoctorLoad = async (caller, hospitalId, fromDate, toDate) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  
  const result = await query({
    IndexName: "GSI2",
    KeyConditionExpression: "hospitalId = :hosp AND createdAt BETWEEN :from AND :to",
    ExpressionAttributeValues: { ":hosp": hospitalId, ":from": fromDate, ":to": toDate + "T23:59:59.999Z" }
  });

  const consults = (result.Items || []).filter(i => i.entityType === "CONSULTATION");
  const load = {};
  for (const c of consults) {
    if (!load[c.doctorId]) load[c.doctorId] = 0;
    load[c.doctorId]++;
  }

  return { fromDate, toDate, perDoctor: load, totalConsultations: consults.length };
};

export const getAlertsLowStock = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `ALERT#HOSP#${hospitalId}`, ":skPrefix": "LOW_STOCK#" }
  });
  return result.Items || [];
};

export const getAlertsExpiry = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `ALERT#HOSP#${hospitalId}`, ":skPrefix": "EXPIRY#" }
  });
  return result.Items || [];
};
