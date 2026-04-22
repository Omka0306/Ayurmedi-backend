import { success, error, serverError } from "../../common/response.js";
import { validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import * as dashboardService from "./service.js";
import Joi from "joi";

const verifyAuth = requireRole([
  "SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST",
]);

const hospitalParamSchema = Joi.object({
  hospitalId: Joi.string().uuid().required()
});

export const getAdminDashboard = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    if (!["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(caller.role)) {
      return error("Forbidden: Admin role required", 403);
    }
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const data = await dashboardService.getAdminDashboard(caller, hospitalId);
    return success(data);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getDoctorDashboard = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    if (!["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"].includes(caller.role)) {
      return error("Forbidden: Doctor role required", 403);
    }
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const data = await dashboardService.getDoctorDashboard(caller, hospitalId);
    return success(data);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const getReceptionDashboard = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    verifyAuth(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalParamSchema)(event);
    const data = await dashboardService.getReceptionDashboard(caller, hospitalId);
    return success(data);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};
