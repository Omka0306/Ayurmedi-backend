import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get, put, update, query, transactWrite } from "../../common/db.js";
import { AuthError, NotFoundError, ConflictError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { generatePDFBuffer } from "./pdfTemplate.js";

const s3Client = new S3Client({});
const getBucketName = () => process.env.DOCUMENTS_BUCKET || "ayurmedi-documents-dev";

export const createPanchakarma = async (caller, patientId, data) => {
  if (caller.hospitalId !== data.hospitalId) throw new AuthError("Access denied");

  const pkId = uuidv4();
  const timestamp = new Date().toISOString();

  const plan = {
    PK: `PATIENT#${patientId}`,
    SK: `PK#${pkId}`,
    entityType: "PANCHAKARMA",
    pkId,
    patientId,
    doctorId: data.doctorId,
    hospitalId: data.hospitalId,
    branchId: data.branchId,
    procedureType: data.procedureType,
    totalSessions: data.totalSessions,
    completedSessions: 0,
    startDate: data.startDate,
    endDate: data.endDate || null,
    preProcedure: data.preProcedure || {},
    materialsRequired: data.materialsRequired || [],
    status: "PLANNED",
    billingMode: data.billingMode,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(plan);
  await logChange({
    entityId: pkId,
    entityType: "PANCHAKARMA",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: caller.hospitalId,
    before: null,
    after: plan
  });
  return plan;
};

export const getPanchakarmas = async (caller, patientId) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `PATIENT#${patientId}`,
      ":skPrefix": "PK#"
    }
  });
  const items = result.Items || [];
  return items.filter(i => i.hospitalId === caller.hospitalId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getPanchakarma = async (caller, patientId, pkId) => {
  const plan = await get({ PK: `PATIENT#${patientId}`, SK: `PK#${pkId}` });
  if (!plan) throw new NotFoundError("Plan not found");
  if (plan.hospitalId !== caller.hospitalId) throw new AuthError("Access denied");
  return plan;
};

export const updatePanchakarma = async (caller, patientId, pkId, data) => {
  const plan = await getPanchakarma(caller, patientId, pkId);
  const timestamp = new Date().toISOString();

  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const expValues = { ":ts": timestamp, ":ub": caller.userId };

  const fields = ["status", "endDate", "preProcedure", "materialsRequired"];
  for (const field of fields) {
    if (data[field] !== undefined) {
      updateExp += `, ${field} = :${field}`;
      expValues[`:${field}`] = data[field];
    }
  }

  const updatedPlan = await update({
    PK: `PATIENT#${patientId}`,
    SK: `PK#${pkId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues,
    ReturnValues: "ALL_NEW"
  });

  await logChange({
    entityId: pkId,
    entityType: "PANCHAKARMA",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: caller.hospitalId,
    before: plan,
    after: updatedPlan
  });

  return updatedPlan;
};

export const completePanchakarma = async (caller, patientId, pkId) => {
  const plan = await getPanchakarma(caller, patientId, pkId);

  // Count resolved sessions (COMPLETED or SKIPPED) from actual session records
  const sessionsResult = await getSessions(caller, pkId);
  const resolvedCount = sessionsResult.filter(
    s => s.status === "COMPLETED" || s.status === "SKIPPED"
  ).length;

  if (resolvedCount < plan.totalSessions) {
    throw new ConflictError(
      `Cannot complete. Only ${resolvedCount} of ${plan.totalSessions} sessions resolved (COMPLETED or SKIPPED).`
    );
  }
  
  const timestamp = new Date().toISOString();
  const updatedPlan = await update({
    PK: `PATIENT#${patientId}`,
    SK: `PK#${pkId}`,
    UpdateExpression: "SET #st = :status, updatedAt = :ts, updatedBy = :ub",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: {
      ":status": "COMPLETED",
      ":ts": timestamp,
      ":ub": caller.userId
    },
    ReturnValues: "ALL_NEW"
  });

  await logChange({
    entityId: pkId,
    entityType: "PANCHAKARMA",
    action: "UPDATE_STATUS",
    userId: caller.userId,
    hospitalId: caller.hospitalId,
    before: plan,
    after: updatedPlan
  });
  return updatedPlan;
};

export const addSession = async (caller, pkId, data) => {
  const patientId = data.patientId;
  const plan = await getPanchakarma(caller, patientId, pkId);

  const sessionId = uuidv4();
  const timestamp = new Date().toISOString();

  const session = {
    PK: `PK#${pkId}`,
    SK: `SESSION#${sessionId}`,
    entityType: "PK_SESSION",
    sessionId,
    pkId,
    patientId,
    hospitalId: plan.hospitalId,
    sessionNumber: data.sessionNumber,
    date: data.date,
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    therapistId: data.therapistId,
    vitalsBefore: data.vitalsBefore || {},
    vitalsAfter: data.vitalsAfter || {},
    materialsUsed: data.materialsUsed || [],
    observations: data.observations || "",
    doctorNotes: data.doctorNotes || "",
    status: data.status,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  const transactItems = [];
  transactItems.push({ Put: { Item: session } });

  if (session.status === "COMPLETED") {
    transactItems.push({
      Update: {
        Key: { PK: `PATIENT#${patientId}`, SK: `PK#${pkId}` },
        UpdateExpression: "ADD completedSessions :one SET updatedAt = :ts",
        ExpressionAttributeValues: { ":one": 1, ":ts": timestamp }
      }
    });

    const deductionMap = {};
    if (session.materialsUsed) {
      for (const mat of session.materialsUsed) {
        if (mat.inventoryItemId) {
          if (!deductionMap[mat.inventoryItemId]) deductionMap[mat.inventoryItemId] = 0;
          deductionMap[mat.inventoryItemId] += mat.quantity;
        }
      }
    }

    const inventoryKeys = Object.keys(deductionMap);
    for (const itemId of inventoryKeys) {
      transactItems.push({
        Update: {
          Key: { PK: `HOSP#${plan.hospitalId}`, SK: `INV#${itemId}` },
          UpdateExpression: "SET currentStock = currentStock - :qty, updatedAt = :ts",
          ConditionExpression: "currentStock >= :qty",
          ExpressionAttributeValues: { ":qty": deductionMap[itemId], ":ts": timestamp }
        }
      });
      transactItems.push({
        Put: {
          Item: {
            PK: `INV#${itemId}`,
            SK: `TXN#${uuidv4()}`,
            entityType: "STOCK_TRANSACTION",
            txnId: uuidv4(),
            itemId,
            hospitalId: plan.hospitalId,
            type: "STOCK_OUT",
            quantity: deductionMap[itemId],
            reason: `PK Session ${sessionId}`,
            referenceId: sessionId,
            performedBy: caller.userId,
            performedAt: timestamp
          }
        }
      });
    }
  }

  if (transactItems.length > 100) throw new ConflictError("Too many operations dynamically bounding");

  try {
    await transactWrite({ TransactItems: transactItems });
  } catch (err) {
    if (err.message.includes("ConditionalCheckFailed") || err.message.includes("TransactionCanceled")) {
      throw new ConflictError("Insufficient inventory stock bounds breached during session fulfillment");
    }
    throw err;
  }

  await logChange({
    entityId: sessionId,
    entityType: "PK_SESSION",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: plan.hospitalId,
    before: null,
    after: session
  });
  return session;
};

export const getSessions = async (caller, pkId) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `PK#${pkId}`,
      ":skPrefix": "SESSION#"
    }
  });
  const items = result.Items || [];
  return items.filter(i => i.hospitalId === caller.hospitalId).sort((a, b) => a.sessionNumber - b.sessionNumber);
};

export const updateSession = async (caller, pkId, sessionId, data) => {
  const patientId = data.patientId;
  const plan = await getPanchakarma(caller, patientId, pkId);

  const existing = await get({ PK: `PK#${pkId}`, SK: `SESSION#${sessionId}` });
  if (!existing) throw new NotFoundError("Session not found");

  const timestamp = new Date().toISOString();
  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const expValues = { ":ts": timestamp, ":ub": caller.userId };

  const fields = ["vitalsAfter", "observations", "doctorNotes"];
  for (const field of fields) {
    if (data[field] !== undefined) {
      updateExp += `, ${field} = :${field}`;
      expValues[`:${field}`] = data[field];
    }
  }

  const updatedSession = await update({
    PK: `PK#${pkId}`,
    SK: `SESSION#${sessionId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues,
    ReturnValues: "ALL_NEW"
  });

  await logChange({
    entityId: sessionId,
    entityType: "PK_SESSION",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: plan.hospitalId,
    before: existing,
    after: updatedSession
  });

  return updatedSession;
};

export const getPkReportPdf = async (caller, pkId, patientId) => {
  const plan = await getPanchakarma(caller, patientId, pkId);
  const sessions = await getSessions(caller, pkId);
  const hospital = await get({ PK: `HOSP#${caller.hospitalId}`, SK: "METADATA" });

  const s3Key = `hospitals/${caller.hospitalId}/panchakarma/${pkId}.pdf`;
  const generateNew = (!plan.pdfS3Key || !plan.pdfGeneratedAt || new Date(plan.updatedAt) > new Date(plan.pdfGeneratedAt));

  if (generateNew) {
    const pdfBuffer = await generatePDFBuffer(plan, sessions, hospital || {});
    await s3Client.send(new PutObjectCommand({
      Bucket: getBucketName(),
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: "application/pdf"
    }));

    const timestamp = new Date().toISOString();
    await update({
      PK: `PATIENT#${patientId}`,
      SK: `PK#${pkId}`,
      UpdateExpression: "SET pdfS3Key = :k, pdfGeneratedAt = :ts",
      ExpressionAttributeValues: { ":k": s3Key, ":ts": timestamp }
    });
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return { url, generated: generateNew, s3Key };
};
