import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole } from "../../common/auth.js";
import {
  prescriptParamsSchema,
  createPrescriptionSchema,
  updatePrescriptionSchema,
} from "./validators.js";
import * as rxService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const verifyAuth = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]);

export const createPrescription = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { consultId } = validatePathParams(prescriptParamsSchema)(event);
    const data = validateBody(createPrescriptionSchema)(event);

    const result = await rxService.createPrescription(caller, consultId, data);

    auditLogger.logChange({
      entityId: result.rxId || consultId,
      entityType: "PRESCRIPTION",
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

export const getPrescriptions = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { consultId } = validatePathParams(prescriptParamsSchema)(event);

    const result = await rxService.getPrescriptions(caller, consultId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updatePrescription = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { consultId, rxId } = validatePathParams(prescriptParamsSchema)(event);
    const data = validateBody(updatePrescriptionSchema)(event);

    const result = await rxService.updatePrescription(caller, consultId, rxId, data);

    auditLogger.logChange({
      entityId: rxId,
      entityType: "PRESCRIPTION",
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

export const getPrescriptionPdf = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { consultId, rxId } = validatePathParams(prescriptParamsSchema)(event);

    const result = await rxService.getPrescriptionPdf(caller, consultId, rxId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
