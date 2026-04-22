import { v4 as uuidv4 } from "uuid";
import { put, update, get, query } from "../../common/db.js";
import { AuthError, NotFoundError, ConflictError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { markTokenComplete } from "../tokens/service.js";

export const createConsultation = async (caller, patientId, data) => {
  const consultId = uuidv4();
  const timestamp = new Date().toISOString();

  if (caller.hospitalId !== data.hospitalId) {
    throw new AuthError("Access denied to this hospital parameter");
  }

  const consultItem = {
    PK: `PATIENT#${patientId}`,
    SK: `CONSULT#${consultId}`,
    entityType: "CONSULTATION",
    consultId,
    patientId,
    doctorId: data.doctorId,
    hospitalId: data.hospitalId,
    branchId: data.branchId,
    visitDate: timestamp.split("T")[0],
    tokenId: data.tokenId,
    chiefComplaint: data.chiefComplaint,
    clinicalExamination: {},
    status: "IN_PROGRESS",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(consultItem);

  await logChange({
    entityId: consultId,
    entityType: "CONSULTATION",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: data.hospitalId,
    before: null,
    after: consultItem
  });

  return consultItem;
};

export const getConsultations = async (caller, patientId) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `PATIENT#${patientId}`,
      ":skPrefix": "CONSULT#"
    }
  });

  const data = result.Items || [];
  data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = data.filter(c => c.hospitalId === caller.hospitalId);

  return filtered;
};

export const getConsultationDetail = async (caller, patientId, consultId) => {
  const consult = await get({
    PK: `PATIENT#${patientId}`,
    SK: `CONSULT#${consultId}`
  });

  if (!consult) throw new NotFoundError("Consultation not found");
  if (consult.hospitalId !== caller.hospitalId) throw new AuthError("Access denied to this resource");

  return consult;
};

export const updateConsultation = async (caller, patientId, consultId, data) => {
  const existing = await getConsultationDetail(caller, patientId, consultId);
  
  if (existing.status === "COMPLETED") {
    throw new ConflictError("Cannot update a completed consultation");
  }

  const timestamp = new Date().toISOString();
  
  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const expValues = {
    ":ts": timestamp,
    ":ub": caller.userId
  };

  if (data.chiefComplaint !== undefined) {
    updateExp += ", chiefComplaint = :cc";
    expValues[":cc"] = data.chiefComplaint;
  }
  if (data.clinicalExamination !== undefined) {
    updateExp += ", clinicalExamination = :ce";
    expValues[":ce"] = data.clinicalExamination;
  }

  const updatedConsult = await update({
    PK: `PATIENT#${patientId}`,
    SK: `CONSULT#${consultId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues,
    ReturnValues: "ALL_NEW"
  });

  await logChange({
    entityId: consultId,
    entityType: "CONSULTATION",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: existing.hospitalId,
    before: existing,
    after: updatedConsult
  });

  return updatedConsult;
};

export const completeConsultation = async (caller, patientId, consultId) => {
  const existing = await getConsultationDetail(caller, patientId, consultId);
  
  if (existing.status === "COMPLETED") {
    throw new ConflictError("Consultation is already completed");
  }

  const timestamp = new Date().toISOString();

  const updatedConsult = await update({
    PK: `PATIENT#${patientId}`,
    SK: `CONSULT#${consultId}`,
    UpdateExpression: "SET #st = :status, completedAt = :ca, updatedAt = :ts, updatedBy = :ub",
    ExpressionAttributeNames: {
      "#st": "status"
    },
    ExpressionAttributeValues: {
      ":status": "COMPLETED",
      ":ca": timestamp,
      ":ts": timestamp,
      ":ub": caller.userId
    },
    ReturnValues: "ALL_NEW"
  });

  await markTokenComplete(
    existing.hospitalId, 
    existing.branchId, 
    existing.doctorId, 
    existing.visitDate, 
    existing.tokenId
  );

  await logChange({
    entityId: consultId,
    entityType: "CONSULTATION",
    action: "COMPLETE",
    userId: caller.userId,
    hospitalId: existing.hospitalId,
    before: existing,
    after: updatedConsult
  });

  return updatedConsult;
};
