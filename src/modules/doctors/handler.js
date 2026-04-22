import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorParamsSchema,
} from "./validators.js";
import * as doctorService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const adminOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN"]);

export const listDoctors = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(doctorParamsSchema)(event);

    const result = await doctorService.listDoctors(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const createDoctor = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(doctorParamsSchema)(event);
    const data = validateBody(createDoctorSchema)(event);

    const result = await doctorService.createDoctor(caller, hospitalId, data);

    auditLogger.logChange({
      entityId: result.doctorId || data.userId,
      entityType: "DOCTOR",
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

export const updateDoctor = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, doctorId } = validatePathParams(doctorParamsSchema)(event);
    const data = validateBody(updateDoctorSchema)(event);

    const result = await doctorService.updateDoctor(caller, hospitalId, doctorId, data);

    auditLogger.logChange({
      entityId: doctorId,
      entityType: "DOCTOR",
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

export const deleteDoctor = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId, doctorId } = validatePathParams(doctorParamsSchema)(event);

    const result = await doctorService.deleteDoctor(caller, hospitalId, doctorId);

    auditLogger.logChange({
      entityId: doctorId,
      entityType: "DOCTOR",
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
