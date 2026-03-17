const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const hospitalWorkflow = require('../workflows/hospital.workflow');
const logger = require('../utils/logger.util');

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('Invalid JSON body');
  }
};

const handleError = (err) => {
  logger.error('Handler error', { error: err.message, stack: err.stack });
  if (isAppError(err)) {
    return toHttpResponse(err);
  }
  return serverError('Internal Server Error', err.message);
};

module.exports.register = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);

    const body = parseBody(event);
    const result = await hospitalWorkflow.registerHospital(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.getHospital = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // Hospital admin or super admin
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);
    const { id } = event.pathParameters || {};
    // Ensure hospital admin can only view their own hospital
    if (authContext.role !== ROLES.SUPER_ADMIN && authContext.hospital_id !== id) {
      return badRequest('Access denied');
    }
    const result = await hospitalWorkflow.getHospital(id);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.listHospitals = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // Only SUPER_ADMIN can list all hospitals
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);
    const result = await hospitalWorkflow.listHospitals();
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

