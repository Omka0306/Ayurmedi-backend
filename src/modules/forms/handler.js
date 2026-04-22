import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  createFormSchema,
  updateFormSchema,
  formParamsSchema,
  publishFormSchema,
} from "./validators.js";
import * as formService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const adminOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN"]);

export const listForms = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(formParamsSchema)(event);

    const result = await formService.listForms(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getForm = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, formId } = validatePathParams(formParamsSchema)(event);
    const version = event.queryStringParameters?.version
      ? parseInt(event.queryStringParameters.version, 10)
      : null;

    const result = await formService.getForm(caller, hospitalId, formId, version);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const createForm = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(formParamsSchema)(event);
    const data = validateBody(createFormSchema)(event);

    const result = await formService.createForm(caller, hospitalId, data);

    auditLogger.logChange({
      entityId: result.formId || hospitalId,
      entityType: "FORM",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { formType: result.formType, name: result.name },
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateForm = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, formId } = validatePathParams(formParamsSchema)(event);
    const data = validateBody(updateFormSchema)(event);

    const result = await formService.updateForm(caller, hospitalId, formId, data);

    auditLogger.logChange({
      entityId: formId,
      entityType: "FORM",
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

export const publishForm = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, formId } = validatePathParams(formParamsSchema)(event);
    if (event.body) validateBody(publishFormSchema)(event);

    const result = await formService.publishForm(caller, hospitalId, formId);

    auditLogger.logChange({
      entityId: formId,
      entityType: "FORM",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { status: "PUBLISHED" },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const deleteForm = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, formId } = validatePathParams(formParamsSchema)(event);

    const result = await formService.deleteForm(caller, hospitalId, formId);

    auditLogger.logChange({
      entityId: formId,
      entityType: "FORM",
      action: "DELETE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
