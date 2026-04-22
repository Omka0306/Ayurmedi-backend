import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  pathParamsSchema,
  createItemSchema,
  updateItemSchema,
  stockInSchema,
  stockAdjustSchema,
} from "./validators.js";
import * as inventoryService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const verifyAuth = requireRole([
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "DOCTOR",
  "PHARMACIST",
]);

export const createItem = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(createItemSchema)(event);

    const result = await inventoryService.createItem(caller, hospitalId, data);

    auditLogger.logChange({
      entityId: result.itemId,
      entityType: "INVENTORY_ITEM",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { name: result.name, category: result.category },
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const listItems = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(pathParamsSchema)(event);

    const result = await inventoryService.listItems(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getItem = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, itemId } = validatePathParams(pathParamsSchema)(event);

    const result = await inventoryService.getItemById(caller, hospitalId, itemId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateItem = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, itemId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(updateItemSchema)(event);

    const result = await inventoryService.updateItem(caller, hospitalId, itemId, data);

    auditLogger.logChange({
      entityId: itemId,
      entityType: "INVENTORY_ITEM",
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

export const deleteItem = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, itemId } = validatePathParams(pathParamsSchema)(event);

    const result = await inventoryService.archiveItem(caller, hospitalId, itemId);

    auditLogger.logChange({
      entityId: itemId,
      entityType: "INVENTORY_ITEM",
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

export const stockIn = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, itemId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(stockInSchema)(event);

    const result = await inventoryService.stockIn(caller, hospitalId, itemId, data);

    auditLogger.logChange({
      entityId: itemId,
      entityType: "INVENTORY_ITEM",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { stockIn: data.quantity, reason: data.reason },
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const stockAdjust = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, itemId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(stockAdjustSchema)(event);

    const result = await inventoryService.stockAdjust(caller, hospitalId, itemId, data);

    auditLogger.logChange({
      entityId: itemId,
      entityType: "INVENTORY_ITEM",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { adjustment: data.quantity, reason: data.reason },
    });

    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getLowStockAlerts = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(pathParamsSchema)(event);

    const result = await inventoryService.getLowStockAlerts(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getExpiryAlerts = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(pathParamsSchema)(event);

    const result = await inventoryService.getExpiryAlerts(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
