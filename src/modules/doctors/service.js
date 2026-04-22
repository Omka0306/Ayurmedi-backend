import { v4 as uuidv4 } from "uuid";
import { get, put, update, query } from "../../common/db.js";
import { NotFoundError, ForbiddenError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";

export const listDoctors = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": "DOCTOR#"
    }
  });

  return result.Items.filter(item => item.status !== "INACTIVE");
};

export const getDoctor = async (caller, hospitalId, doctorId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  const doctor = await get({ Key: { PK: `HOSP#${hospitalId}`, SK: `DOCTOR#${doctorId}` } });
  if (!doctor || doctor.status === "INACTIVE") throw new NotFoundError("Doctor not found");
  return doctor;
};

export const createDoctor = async (caller, hospitalId, data) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  
  const doctorId = uuidv4();
  const timestamp = new Date().toISOString();

  const doctorItem = {
    PK: `HOSP#${hospitalId}`,
    SK: `DOCTOR#${doctorId}`,
    entityType: "DOCTOR",
    doctorId,
    userId: data.userId,
    hospitalId,
    branchIds: data.branchIds,
    name: data.name,
    specialization: data.specialization,
    registrationNumber: data.registrationNumber,
    availabilityStatus: "AVAILABLE",
    averageConsultationMinutes: data.averageConsultationMinutes || 15,
    digitalSignatureS3Key: null,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(doctorItem);

  logChange({
    entityId: doctorId,
    entityType: "DOCTOR",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: null,
    after: doctorItem
  });

  return { doctorId, message: "Doctor created successfully" };
};

export const updateDoctor = async (caller, hospitalId, doctorId, data) => {
  const existing = await getDoctor(caller, hospitalId, doctorId);

  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  const fields = [
    "branchIds", "name", "specialization", "registrationNumber", 
    "availabilityStatus", "averageConsultationMinutes", "digitalSignatureS3Key", "status"
  ];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = data[field];
    }
  });

  if (updateExpressions.length === 0) return { message: "No updates provided" };

  updateExpressions.push("#updatedAt = :updatedAt", "#updatedBy = :updatedBy");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeNames["#updatedBy"] = "updatedBy";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();
  expressionAttributeValues[":updatedBy"] = caller.userId;

  const updatedAttrs = await update({
    Key: { PK: `HOSP#${hospitalId}`, SK: `DOCTOR#${doctorId}` },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  });

  logChange({
    entityId: doctorId,
    entityType: "DOCTOR",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: existing,
    after: updatedAttrs
  });

  return updatedAttrs;
};

export const deleteDoctor = async (caller, hospitalId, doctorId) => {
  const existing = await getDoctor(caller, hospitalId, doctorId);

  await update({
    Key: { PK: `HOSP#${hospitalId}`, SK: `DOCTOR#${doctorId}` },
    UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt, #updatedBy = :updatedBy",
    ExpressionAttributeNames: {
      "#status": "status",
      "#updatedAt": "updatedAt",
      "#updatedBy": "updatedBy"
    },
    ExpressionAttributeValues: {
      ":status": "INACTIVE",
      ":updatedAt": new Date().toISOString(),
      ":updatedBy": caller.userId
    }
  });

  logChange({
    entityId: doctorId,
    entityType: "DOCTOR",
    action: "DELETE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: existing,
    after: { ...existing, status: "INACTIVE" }
  });

  return { message: "Doctor deactivated successfully" };
};
