import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  patientParamsSchema,
  createPatientSchema,
  updatePatientSchema,
  createHistorySchema,
} from "./validators.js";
import * as patientService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const verifyAuth = requireRole([
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
]);

export const createPatient = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId } = validatePathParams(patientParamsSchema)(event);
    const data = validateBody(createPatientSchema)(event);

    const result = await patientService.createPatient(caller, hospitalId, branchId, data);

    auditLogger.logChange({
      entityId: result.patientId,
      entityType: "PATIENT",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { patientName: result.patientName },
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const listPatients = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId } = validatePathParams(patientParamsSchema)(event);

    const result = await patientService.listPatients(caller, hospitalId, branchId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getPatient = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId, patientId } = validatePathParams(patientParamsSchema)(event);

    const result = await patientService.getPatient(caller, hospitalId, branchId, patientId);
    return success({ data: result });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updatePatient = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId, patientId } = validatePathParams(patientParamsSchema)(event);
    const data = validateBody(updatePatientSchema)(event);

    const result = await patientService.updatePatient(caller, hospitalId, branchId, patientId, data);

    auditLogger.logChange({
      entityId: patientId,
      entityType: "PATIENT",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
    });

    return success({ data: result });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const searchPatients = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(patientParamsSchema)(event);
    const queryStr = event.queryStringParameters || {};

    if (!queryStr.q || queryStr.q.length < 2) {
      return error("Search query 'q' must be at least 2 characters long", 400);
    }

    const result = await patientService.searchPatients(caller, hospitalId, queryStr.q);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const addHistory = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    const docOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]);
    docOnly(event);
    const caller = getCallerIdentity(event);

    const { hospitalId, patientId } = validatePathParams(patientParamsSchema)(event);
    const data = validateBody(createHistorySchema)(event);

    const result = await patientService.addHistory(caller, hospitalId, patientId, data);

    auditLogger.logChange({
      entityId: result.historyId || patientId,
      entityType: "PATIENT_HISTORY",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getHistoryList = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, patientId } = validatePathParams(patientParamsSchema)(event);

    const result = await patientService.getHistoryList(caller, hospitalId, patientId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getHistoryDetail = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, patientId, historyId } = validatePathParams(patientParamsSchema)(event);

    const result = await patientService.getHistoryDetail(caller, hospitalId, patientId, historyId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
