import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole } from "../../common/auth.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  querySchema,
} from "./validators.js";
import * as usersService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const adminOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN"]);

export const listUsers = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const queryParams = event.queryStringParameters || {};
    const { error: err, value } = querySchema.validate(queryParams, {
      stripUnknown: true,
    });
    if (err) throw err;
    const result = await usersService.listUsers(caller, value);
    return success({ items: result.items, lastKey: result.lastKey });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getUser = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { userId } = validatePathParams(userIdParamSchema)(event);
    const result = await usersService.getUser(caller, userId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const createUser = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    adminOnly(event);
    const caller = getCallerIdentity(event);
    // Strip password from validated data before logging
    const data = validateBody(createUserSchema)(event);
    const { password: _pw, ...safeData } = data;

    const result = await usersService.createUser(caller, data);

    auditLogger.logChange({
      entityId: result.userId || result.sub,
      entityType: "USER",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: safeData, // never log password
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateUser = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { userId } = validatePathParams(userIdParamSchema)(event);
    const data = validateBody(updateUserSchema)(event);

    const result = await usersService.updateUser(caller, userId, data);

    auditLogger.logChange({
      entityId: userId,
      entityType: "USER",
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

export const deleteUser = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { userId } = validatePathParams(userIdParamSchema)(event);

    const result = await usersService.deleteUser(caller, userId);

    auditLogger.logChange({
      entityId: userId,
      entityType: "USER",
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
