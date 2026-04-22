import { v4 as uuidv4 } from "uuid";
import { put, update, query, scan } from "../../common/db.js";
import { NotFoundError, AuthError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import * as queueManager from "./queueManager.js";

export const closeRedis = async () => await queueManager.closeRedis();

export const generateDoctorToken = async (hospitalId, branchId, doctorId, dateStr = null) => {
  const date = dateStr || new Date().toISOString().split("T")[0];
  const tokenRecord = await update({
    PK: `COUNTER#DOCTOR#${doctorId}`,
    SK: `DATE#${date}`,
    UpdateExpression: "ADD currentNumber :inc",
    ExpressionAttributeValues: { ":inc": 1 },
    ReturnValues: "UPDATED_NEW"
  });
  return tokenRecord.currentNumber || tokenRecord.currentToken;
};

const syncQueue = async (hospitalId, branchId, doctorId, date) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}#BRANCH#${branchId}#DATE#${date}`,
      ":skPrefix": "TOKEN#"
    }
  });
  const docTokens = (result.Items || []).filter(t => t.doctorId === doctorId);
  return await queueManager.rebuildQueue(hospitalId, branchId, doctorId, date, docTokens);
};

export const generateToken = async (caller, hospitalId, branchId, data) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const today = new Date().toISOString().split("T")[0];
  const tokenId = uuidv4();
  
  const tokenNumber = await generateDoctorToken(hospitalId, branchId, data.doctorId, today);
  const displayNumber = "A-" + String(tokenNumber).padStart(3, '0');

  const timestamp = new Date().toISOString();
  
  const tokenRecord = {
    PK: `HOSP#${hospitalId}#BRANCH#${branchId}#DATE#${today}`,
    SK: `TOKEN#${tokenId}`,
    "GSI1-PK": `DOCTOR#${data.doctorId}`,
    "GSI1-SK": `STATUS#WAITING`,
    entityType: "TOKEN",
    tokenId,
    hospitalId,
    branchId,
    patientId: data.patientId,
    patientName: data.patientName,
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    tokenNumber,
    displayNumber,
    date: today,
    registeredAt: timestamp,
    calledAt: null,
    completedAt: null,
    priority: data.priority || "NORMAL",
    status: "WAITING",
    estimatedWaitMinutes: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await put(tokenRecord);
  await syncQueue(hospitalId, branchId, data.doctorId, today);

  await logChange({
    entityId: tokenId,
    entityType: "TOKEN",
    action: "CREATE",
    userId: caller.userId,
    hospitalId,
    before: null,
    after: tokenRecord
  });

  return tokenRecord;
};

const getTokenById = async (tokenId) => {
  const res = await scan({
    FilterExpression: "tokenId = :tid AND entityType = :et",
    ExpressionAttributeValues: { ":tid": tokenId, ":et": "TOKEN" }
  });
  if (!res.Items || res.Items.length === 0) throw new NotFoundError("Token not found");
  return res.Items[0];
};

export const updateTokenStatus = async (caller, tokenId, status) => {
  const existing = await getTokenById(tokenId);
  if (existing.hospitalId !== caller.hospitalId) throw new AuthError("Access denied");

  const timestamp = new Date().toISOString();
  let updateExp = "SET #st = :status, #gsk = :gsk, updatedAt = :ts";
  const expNames = { "#st": "status", "#gsk": "GSI1-SK" };
  const expVals = { ":status": status, ":gsk": `STATUS#${status}`, ":ts": timestamp };

  if (status === "CALLED") {
    updateExp += ", calledAt = :ct";
    expVals[":ct"] = timestamp;
  } else if (status === "COMPLETED" || status === "SKIPPED" || status === "ABSENT") {
    updateExp += ", completedAt = :ct";
    expVals[":ct"] = timestamp;
  }

  const updatedToken = await update({
    PK: existing.PK,
    SK: existing.SK,
    UpdateExpression: updateExp,
    ExpressionAttributeNames: expNames,
    ExpressionAttributeValues: expVals,
    ReturnValues: "ALL_NEW"
  });

  await syncQueue(existing.hospitalId, existing.branchId, existing.doctorId, existing.date);

  await logChange({
    entityId: tokenId,
    entityType: "TOKEN",
    action: `STATUS_${status}`,
    userId: caller.userId,
    hospitalId: existing.hospitalId,
    before: existing,
    after: updatedToken
  });

  return updatedToken;
};

export const updateTokenPriority = async (caller, tokenId, priority) => {
  const existing = await getTokenById(tokenId);
  if (existing.hospitalId !== caller.hospitalId) throw new AuthError("Access denied");

  const timestamp = new Date().toISOString();
  const updatedToken = await update({
    PK: existing.PK,
    SK: existing.SK,
    UpdateExpression: "SET priority = :p, updatedAt = :ts",
    ExpressionAttributeValues: { ":p": priority, ":ts": timestamp },
    ReturnValues: "ALL_NEW"
  });

  await syncQueue(existing.hospitalId, existing.branchId, existing.doctorId, existing.date);

  await logChange({
    entityId: tokenId,
    entityType: "TOKEN",
    action: `PRIORITY_${priority}`,
    userId: caller.userId,
    hospitalId: existing.hospitalId,
    before: existing,
    after: updatedToken
  });

  return updatedToken;
};

export const getDisplayQueue = async (hospitalId, branchId) => {
  const today = new Date().toISOString().split("T")[0];
  let allTokens = [];

  const pattern = `queue:${hospitalId}:${branchId}:*:${today}`;
  if (queueManager.redisClient) {
    try {
      const keys = await queueManager.redisClient.keys(pattern);
      for (const k of keys) {
         const data = await queueManager.redisClient.get(k);
         if (data) allTokens = allTokens.concat(JSON.parse(data));
      }
      return allTokens.map(t => ({
        tokenNumber: t.tokenNumber,
        displayNumber: t.displayNumber,
        patientName: t.patientName,
        doctorName: t.doctorName,
        status: t.status,
        estimatedWaitMinutes: t.estimatedWaitMinutes
      }));
    } catch (e) {}
  }

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}#BRANCH#${branchId}#DATE#${today}`,
      ":skPrefix": "TOKEN#"
    }
  });

  const activeStatuses = ["WAITING", "CALLED", "IN_CONSULTATION"];
  let queue = (result.Items || []).filter(t => activeStatuses.includes(t.status));
  queue = await queueManager.rebuildQueue(hospitalId, branchId, "DUMMY", today, queue); 

  return queue.map(t => ({
    tokenNumber: t.tokenNumber,
    displayNumber: t.displayNumber,
    patientName: t.patientName,
    doctorName: t.doctorName,
    status: t.status,
    estimatedWaitMinutes: t.estimatedWaitMinutes
  }));
};

export const getTokensToday = async (caller, hospitalId, branchId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const today = new Date().toISOString().split("T")[0];
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}#BRANCH#${branchId}#DATE#${today}`,
      ":skPrefix": "TOKEN#"
    }
  });
  return result.Items || [];
};

export const getNextToken = async (caller, hospitalId, branchId, doctorId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const today = new Date().toISOString().split("T")[0];
  
  let queue = [];
  queue = await queueManager.getQueue(hospitalId, branchId, doctorId, today);
  
  if (!queue) {
     const result = await query({
       KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
       ExpressionAttributeValues: {
         ":pk": `HOSP#${hospitalId}#BRANCH#${branchId}#DATE#${today}`,
         ":skPrefix": "TOKEN#"
       }
     });
     const docTokens = (result.Items || []).filter(t => t.doctorId === doctorId);
     queue = await queueManager.rebuildQueue(hospitalId, branchId, doctorId, today, docTokens);
  }

  const waitingToken = queue.find(t => t.status === "WAITING");
  if (!waitingToken) throw new NotFoundError("No patients waiting");
  return waitingToken;
};

// Also reimplement markTokenComplete for Phase 6 Consultations fallback:
export const markTokenComplete = async (hospitalId, branchId, doctorId, dateStr, tokenId) => {
  return await updateTokenStatus({ hospitalId, userId: "system" }, tokenId, "COMPLETED");
};
