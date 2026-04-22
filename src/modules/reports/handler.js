import { success, error, serverError } from "../../common/response.js";
import { validatePathParams, validateQueryParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import * as reportsService from "./service.js";
import Joi from "joi";

const verifyAuth = requireRole([
  "SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST",
]);

const hospitalParamSchema = Joi.object({
  hospitalId: Joi.string().uuid().required()
});

const patientParamSchema = Joi.object({
  patientId: Joi.string().uuid().required()
});

const consultParamSchema = Joi.object({
  consultId: Joi.string().uuid().required()
});

const pkParamSchema = Joi.object({
  pkId: Joi.string().uuid().required()
});

const jobParamSchema = Joi.object({
  jobId: Joi.string().required()
});

const dateRangeQuerySchema = Joi.object({
  from: Joi.string().isoDate().required(),
  to: Joi.string().isoDate().required()
}).options({ stripUnknown: true });

const dateQuerySchema = Joi.object({
  date: Joi.string().isoDate().optional()
}).options({ stripUnknown: true });

export const getJobStatus = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { jobId } = validatePathParams(jobParamSchema)(event);
    const result = await reportsService.getJobStatus(caller, jobId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const triggerFullHistory = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(patientParamSchema)(event);
    const result = await reportsService.requestPatientReport(
      caller,
      caller.hospitalId,
      { patientId },
      "FULL_HISTORY",
    );
    return success(result, 202);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const triggerVisitSummary = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { consultId } = validatePathParams(consultParamSchema)(event);
    const patientId = event.queryStringParameters?.patientId;
    if (!patientId) throw Object.assign(new Error("patientId query param required"), { statusCode: 400 });
    const result = await reportsService.requestPatientReport(
      caller,
      caller.hospitalId,
      { patientId, consultId },
      "VISIT_SUMMARY",
    );
    return success(result, 202);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const triggerPkSummary = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { pkId } = validatePathParams(pkParamSchema)(event);
    const patientId = event.queryStringParameters?.patientId;
    if (!patientId) throw Object.assign(new Error("patientId query param required"), { statusCode: 400 });
    const result = await reportsService.requestPatientReport(
      caller,
      caller.hospitalId,
      { patientId, pkId },
      "PK_SUMMARY",
    );
    return success(result, 202);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const triggerDischargeSummary = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { patientId } = validatePathParams(patientParamSchema)(event);
    const { dischargeNotes } = JSON.parse(event.body || "{}");
    const result = await reportsService.requestPatientReport(
      caller,
      caller.hospitalId,
      { patientId, hospitalId: caller.hospitalId, dischargeNotes },
      "DISCHARGE_SUMMARY",
    );
    return success(result, 202);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getDailyOpd = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const { date } = validateQueryParams(dateQuerySchema)(event);
    const resolvedDate = date || new Date().toISOString().split("T")[0];
    const result = await reportsService.getDailyOpd(caller, hospitalId, resolvedDate);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getRevenueReport = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const { from, to } = validateQueryParams(dateRangeQuerySchema)(event);
    const result = await reportsService.getRevenueReport(caller, hospitalId, from, to);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getInventoryUsage = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const { from, to } = validateQueryParams(dateRangeQuerySchema)(event);
    const result = await reportsService.getInventoryUsage(caller, hospitalId, from, to);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getDoctorLoad = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const { from, to } = validateQueryParams(dateRangeQuerySchema)(event);
    const result = await reportsService.getDoctorLoad(caller, hospitalId, from, to);
    return success(result);
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
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const result = await reportsService.getAlertsLowStock(caller, hospitalId);
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
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const result = await reportsService.getAlertsExpiry(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
