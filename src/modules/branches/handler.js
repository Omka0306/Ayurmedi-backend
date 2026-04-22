import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  createBranchSchema,
  updateBranchSchema,
  branchParamsSchema,
} from "./validators.js";
import * as branchService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const adminOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN"]);

export const listBranches = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(branchParamsSchema)(event);

    const result = await branchService.listBranches(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const createBranch = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(branchParamsSchema)(event);
    const data = validateBody(createBranchSchema)(event);

    const result = await branchService.createBranch(caller, hospitalId, data);

    auditLogger.logChange({
      entityId: result.branchId || hospitalId,
      entityType: "BRANCH",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: result,
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateBranch = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId } = validatePathParams(branchParamsSchema)(event);
    const data = validateBody(updateBranchSchema)(event);

    const result = await branchService.updateBranch(caller, hospitalId, branchId, data);

    auditLogger.logChange({
      entityId: branchId,
      entityType: "BRANCH",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: result,
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
