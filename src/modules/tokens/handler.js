import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import {
  getCallerIdentity,
  requireRole,
  enforceHospitalScope,
} from "../../common/auth.js";
import {
  createTokenSchema,
  pathParamsSchema,
  priorityTokenSchema,
} from "./validators.js";
import * as tokenService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const verifyAuth = requireRole([
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
]);

export const createToken = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId } =
      validatePathParams(pathParamsSchema)(event);
    const data = validateBody(createTokenSchema)(event);

    const result = await tokenService.generateToken(
      caller,
      hospitalId,
      branchId,
      data,
    );

    auditLogger.logChange({
      entityId: result.tokenId,
      entityType: "TOKEN",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getTodayTokens = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId } =
      validatePathParams(pathParamsSchema)(event);

    const result = await tokenService.getTokensToday(
      caller,
      hospitalId,
      branchId,
    );
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getDisplayQueue = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    // No auth required for public displays — display boards are unauthenticated
    const { hospitalId, branchId } =
      validatePathParams(pathParamsSchema)(event);
    const result = await tokenService.getDisplayQueue(hospitalId, branchId);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const callToken = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { tokenId } = validatePathParams(pathParamsSchema)(event);

    const result = await tokenService.updateTokenStatus(
      caller,
      tokenId,
      "CALLED",
    );

    auditLogger.logChange({
      entityId: tokenId,
      entityType: "TOKEN",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { status: "CALLED" },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const skipToken = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { tokenId } = validatePathParams(pathParamsSchema)(event);

    const result = await tokenService.updateTokenStatus(
      caller,
      tokenId,
      "SKIPPED",
    );

    auditLogger.logChange({
      entityId: tokenId,
      entityType: "TOKEN",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { status: "SKIPPED" },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const completeToken = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { tokenId } = validatePathParams(pathParamsSchema)(event);

    const result = await tokenService.updateTokenStatus(
      caller,
      tokenId,
      "COMPLETED",
    );

    auditLogger.logChange({
      entityId: tokenId,
      entityType: "TOKEN",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { status: "COMPLETED" },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updatePriority = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { tokenId } = validatePathParams(pathParamsSchema)(event);
    const { priority } = validateBody(priorityTokenSchema)(event);

    const result = await tokenService.updateTokenPriority(
      caller,
      tokenId,
      priority,
    );

    auditLogger.logChange({
      entityId: tokenId,
      entityType: "TOKEN",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { priority },
    });

    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getNextToken = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, branchId, doctorId } =
      validatePathParams(pathParamsSchema)(event);

    const result = await tokenService.getNextToken(
      caller,
      hospitalId,
      branchId,
      doctorId,
    );
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500)
      return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
