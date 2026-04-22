import { v4 as uuidv4 } from "uuid";
import { get, put, update, query, scan } from "../../common/db.js";
import { AuthError, NotFoundError, ValidationError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { generateUHID } from "./uhid.js";
import { generateDoctorToken } from "../tokens/service.js";

const validateFormResponses = (template, responses) => {
  const allFieldIds = [];
  const requiredFieldIds = [];
  
  (template.sections || []).forEach(section => {
    (section.fields || []).forEach(f => {
      allFieldIds.push(f.fieldId);
      if (f.required) requiredFieldIds.push(f.fieldId);
    });
  });

  for (const reqId of requiredFieldIds) {
    if (responses[reqId] === undefined || responses[reqId] === null) {
      throw new ValidationError(`Missing required field: ${reqId}`);
    }
  }

  for (const respId of Object.keys(responses)) {
    if (!allFieldIds.includes(respId)) {
      throw new ValidationError(`Unknown field in responses: ${respId}`);
    }
  }
};

export const createPatient = async (caller, hospitalId, branchId, data) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const { patientName, assignedDoctorId, mobileNumber, formData } = data;
  
  const template = await get({
    PK: `HOSP#${hospitalId}`,
    SK: `FORM#${formData.formTemplateId}#V${formData.formVersion}`
  });

  if (!template || template.status !== "PUBLISHED") {
    throw new ValidationError("Invalid or unpublished form template reference");
  }

  validateFormResponses(template, formData.responses);

  const patientId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const uhid = await generateUHID(hospitalId);
  const tokenNumber = await generateDoctorToken(hospitalId, branchId, assignedDoctorId);

  const userId = caller.userId;

  const patientItem = {
    PK: `HOSP#${hospitalId}#BRANCH#${branchId}`,
    SK: `PATIENT#${patientId}`,
    entityType: "PATIENT",
    patientId,
    hospitalId,
    branchId,
    uhid,
    patientName,
    tokenNumber,
    registrationDate: timestamp,
    assignedDoctorId,
    formData,
    mobileNumber,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId,
    updatedBy: userId
  };

  await put(patientItem);

  await logChange({
    entityId: patientId,
    entityType: "PATIENT",
    action: "CREATE",
    userId,
    hospitalId,
    before: null,
    after: patientItem
  });

  return { patientId, uhid, tokenNumber, message: "Patient registered successfully" };
};

export const listPatients = async (caller, hospitalId, branchId) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}#BRANCH#${branchId}`,
      ":skPrefix": "PATIENT#"
    }
  });
  
  return result.Items;
};

export const getPatient = async (caller, hospitalId, branchId, patientId) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const patient = await get({
    PK: `HOSP#${hospitalId}#BRANCH#${branchId}`,
    SK: `PATIENT#${patientId}`
  });

  if (!patient) throw new NotFoundError("Patient not found");
  return patient;
};

export const updatePatient = async (caller, hospitalId, branchId, patientId, data) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const existing = await getPatient(caller, hospitalId, branchId, patientId);
  const timestamp = new Date().toISOString();

  if (data.formData) {
    const template = await get({
      PK: `HOSP#${hospitalId}`,
      SK: `FORM#${data.formData.formTemplateId}#V${data.formData.formVersion}`
    });
    if (!template || template.status !== "PUBLISHED") {
      throw new ValidationError("Invalid or unpublished form template reference");
    }
    validateFormResponses(template, data.formData.responses);
  }

  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const expValues = {
    ":ts": timestamp,
    ":ub": caller.userId
  };
  const expNames = {};

  if (data.patientName) {
    updateExp += ", patientName = :pn";
    expValues[":pn"] = data.patientName;
  }
  if (data.status) {
    updateExp += ", #st = :status";
    expNames["#st"] = "status";
    expValues[":status"] = data.status;
  }
  if (data.mobileNumber) {
    updateExp += ", mobileNumber = :mob";
    expValues[":mob"] = data.mobileNumber;
  }
  if (data.assignedDoctorId) {
    updateExp += ", assignedDoctorId = :doc";
    expValues[":doc"] = data.assignedDoctorId;
  }
  if (data.formData) {
    updateExp += ", formData = :fd";
    expValues[":fd"] = data.formData;
  }

  const updateParams = {
    PK: `HOSP#${hospitalId}#BRANCH#${branchId}`,
    SK: `PATIENT#${patientId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues,
    ReturnValues: "ALL_NEW"
  };

  if (Object.keys(expNames).length > 0) {
    updateParams.ExpressionAttributeNames = expNames;
  }

  const updatedPatient = await update(updateParams);

  await logChange({
    entityId: patientId,
    entityType: "PATIENT",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId,
    before: existing,
    after: updatedPatient
  });

  return updatedPatient;
};

export const searchPatients = async (caller, hospitalId, q) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const isNumeric = /^\d+$/.test(q);

  if (isNumeric) {
    const result = await query({
      IndexName: "GSI3",
      KeyConditionExpression: "mobileNumber = :mob",
      FilterExpression: "hospitalId = :hosp",
      ExpressionAttributeValues: {
        ":mob": q,
        ":hosp": hospitalId
      },
      Limit: 20
    });
    return result.Items;
  } else {
    // Note: OpenSearch upgrade path recommended for advanced textual searches. 
    // Using a base scan here for MVP capabilities.
    const result = await scan({
      FilterExpression: "hospitalId = :hosp AND contains(patientName, :q) AND entityType = :type",
      ExpressionAttributeValues: {
        ":hosp": hospitalId,
        ":q": q,
        ":type": "PATIENT"
      },
      Limit: 20
    });
    return result.Items;
  }
};

export const addHistory = async (caller, hospitalId, patientId, data) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const template = await get({
    PK: `HOSP#${hospitalId}`,
    SK: `FORM#${data.formData.formTemplateId}#V${data.formData.formVersion}`
  });
  
  if (!template || template.status !== "PUBLISHED") {
    throw new ValidationError("Invalid or unpublished form template reference for History");
  }
  
  validateFormResponses(template, data.formData.responses);

  const historyId = uuidv4();
  const timestamp = new Date().toISOString();

  const historyItem = {
    PK: `PATIENT#${patientId}`,
    SK: `VISIT#${historyId}`,
    entityType: "PATIENT_HISTORY",
    historyId,
    patientId,
    hospitalId,
    formData: data.formData,
    submittedAt: timestamp,
    submittedBy: caller.userId
  };

  await put(historyItem);
  return { historyId, message: "Patient history recorded successfully" };
};

export const getHistoryList = async (caller, hospitalId, patientId) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }
  
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `PATIENT#${patientId}`,
      ":skPrefix": "VISIT#"
    }
  });

  const data = result.Items || [];
  data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  return data;
};

export const getHistoryDetail = async (caller, hospitalId, patientId, historyId) => {
  if (caller.hospitalId !== hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const result = await get({
    PK: `PATIENT#${patientId}`,
    SK: `VISIT#${historyId}`
  });

  if (!result) throw new NotFoundError("Patient history record not found");
  
  return { data: result };
};
