import { success, error, serverError } from "../../common/response.js";
import { validateBody, validatePathParams } from "../../common/validators.js";
import { getCallerIdentity, requireRole, enforceHospitalScope } from "../../common/auth.js";
import { updateHospitalSchema, hospitalIdParamSchema } from "./validators.js";
import * as hospitalService from "./service.js";
import * as auditLogger from "../../common/auditLogger.js";

const adminOnly = requireRole(["SUPER_ADMIN", "HOSPITAL_ADMIN"]);

export const getHospital = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalIdParamSchema)(event);

    const result = await hospitalService.getHospital(caller, hospitalId);
    return success(result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) return error(err.message, err.statusCode);
    return serverError(requestId, err);
  }
};

export const updateHospital = async (event) => {
  const requestId = event.requestContext?.requestId;
  try {
    enforceHospitalScope(event);
    adminOnly(event);
    const caller = getCallerIdentity(event);
    const { hospitalId } = validatePathParams(hospitalIdParamSchema)(event);
    const data = validateBody(updateHospitalSchema)(event);

    const result = await hospitalService.updateHospital(caller, hospitalId, data);

    auditLogger.logChange({
      entityId: hospitalId,
      entityType: "HOSPITAL",
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
