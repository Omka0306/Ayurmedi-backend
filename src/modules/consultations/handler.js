import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole } from "../../common/auth.js";
import {
  consultParamsSchema,
  createConsultSchema,
  updateConsultSchema,
} from "./validators.js";
import * as consultService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const verifyAuth = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]);

export const createConsultation = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(consultParamsSchema)(event);
    const data = validateBody(createConsultSchema)(event);

    const result = await consultService.createConsultation(caller, patientId, data);

    auditLogger.logChange({
      entityId: result.consultId || patientId,
      entityType: "CONSULTATION",
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

export const getConsultations = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(consultParamsSchema)(event);

    const result = await consultService.getConsultations(caller, patientId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getConsultationDetail = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId, consultId } = validatePathParams(consultParamsSchema)(event);

    const result = await consultService.getConsultationDetail(caller, patientId, consultId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateConsultation = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId, consultId } = validatePathParams(consultParamsSchema)(event);
    const data = validateBody(updateConsultSchema)(event);

    const result = await consultService.updateConsultation(caller, patientId, consultId, data);

    auditLogger.logChange({
      entityId: consultId,
      entityType: "CONSULTATION",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const completeConsultation = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId, consultId } = validatePathParams(consultParamsSchema)(event);

    const result = await consultService.completeConsultation(caller, patientId, consultId);

    auditLogger.logChange({
      entityId: consultId,
      entityType: "CONSULTATION",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { status: "COMPLETED" },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
