import { success, error, serverError } from "../../common/response.js";
import {
  validateBody,
  validatePathParams,
  validateQueryParams,
} from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  pathParamsSchema,
  createBillSchema,
  updateBillSchema,
  addPaymentSchema,
  summaryQuerySchema,
} from "./validators.js";
import * as billingService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";
import Joi from "joi";

const verifyAuth = requireRole([
  "SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST",
]);

const patientIdQuerySchema = Joi.object({
  patientId: Joi.string().uuid().required()
}).options({ stripUnknown: true });

export const createBill = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(pathParamsSchema)(event);
    const data = validateBody(createBillSchema)(event);
    const result = await billingService.createBill(caller, patientId, data);
    auditLogger.logChange({
      entityId: result.billId,
      entityType: "BILL",
      action: "CREATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { totalAmount: result.totalAmount },
    });
    return success(result, 201);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getPatientBills = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(pathParamsSchema)(event);
    const result = await billingService.getPatientBills(caller, patientId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getBill = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { billId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const result = await billingService.getBill(caller, query.patientId, billId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateBill = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { billId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const data = validateBody(updateBillSchema)(event);
    const result = await billingService.updateBill(
      caller, query.patientId, billId, data,
    );
    auditLogger.logChange({
      entityId: billId,
      entityType: "BILL",
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

export const addPayment = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { billId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const data = validateBody(addPaymentSchema)(event);
    const idemKey =
      event.headers?.["idempotency-key"] ||
      event.headers?.["Idempotency-Key"] ||
      null;
    const result = await billingService.addPayment(
      caller, query.patientId, billId, data, idemKey,
    );
    auditLogger.logChange({
      entityId: billId,
      entityType: "BILL",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: caller.hospitalId,
      after: { paymentMode: data.mode, amount: data.amount },
    });
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getBillPdf = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { billId } = validatePathParams(pathParamsSchema)(event);
    const query = validateQueryParams(patientIdQuerySchema)(event);
    const result = await billingService.getBillPdf(caller, query.patientId, billId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getBillsSummary = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(pathParamsSchema)(event);
    const queryParams = validateQueryParams(summaryQuerySchema)(event);
    const result = await billingService.getBillsSummary(
      caller, hospitalId, queryParams.from, queryParams.to,
    );
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
