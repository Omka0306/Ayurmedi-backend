import { success, error, serverError } from "../../common/response.js";
import {
  validateBody,
  validatePathParams,
  validateQueryParams,
} from "../../common/validators.js";
import { getCallerIdentity, requireRole } from "../../common/auth.js";
import {
  pathParamsSchema,
  createPkSchema,
  updatePkSchema,
  createSessionSchema,
  updateSessionSchema,
} from "./validators.js";
import * as pkService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";
import Joi from "joi";

const verifyAuth = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]);

const patientIdQuerySchema = Joi.object({
  patientId: Joi.string().uuid().required()
}).options({ stripUnknown: true });

export const createPanchakarma = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(createPkSchema)(event);
    const result = await pkService.createPanchakarma(caller, patientId, data);
    auditLogger.logChange({
      entityId: result.pkId,
      entityType: "PANCHAKARMA",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { procedureType: result.procedureType },
    });
    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getPanchakarmas = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(pathParamsSchema)(event);
    const result = await pkService.getPanchakarmas(caller, patientId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getPanchakarma = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const result = await pkService.getPanchakarma(caller, query.patientId, pkId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updatePanchakarma = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const data = validateBody(updatePkSchema)(event);
    const result = await pkService.updatePanchakarma(caller, query.patientId, pkId, data);
    auditLogger.logChange({
      entityId: pkId,
      entityType: "PANCHAKARMA",
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

export const addSession = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(createSessionSchema)(event);
    const result = await pkService.addSession(caller, pkId, data);
    auditLogger.logChange({
      entityId: result.sessionId || pkId,
      entityType: "PK_SESSION",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { sessionNumber: data.sessionNumber, status: data.status },
    });
    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getSessions = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const result = await pkService.getSessions(caller, pkId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateSession = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId, sessionId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(updateSessionSchema)(event);
    const result = await pkService.updateSession(caller, pkId, sessionId, data);
    auditLogger.logChange({
      entityId: sessionId,
      entityType: "PK_SESSION",
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

export const completePanchakarma = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const body = validateBody(
      Joi.object({ patientId: Joi.string().uuid().required() }).options({ stripUnknown: true }),
    )(event);
    const result = await pkService.completePanchakarma(caller, body.patientId, pkId);
    auditLogger.logChange({
      entityId: pkId,
      entityType: "PANCHAKARMA",
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

export const getPkReportPdf = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const result = await pkService.getPkReportPdf(caller, pkId, query.patientId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
