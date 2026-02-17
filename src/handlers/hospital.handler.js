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

/**
 * GET /hospitals/list
 * List all hospitals with pagination
 * Role: SUPER_ADMIN
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);

    const queryParams = event.queryStringParameters || {};
    const options = {
      limit: parseInt(queryParams.limit) || 50,
      lastKey: queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null,
    };

    const result = await hospitalWorkflow.listHospitals(options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /hospitals/{id}
 * Get hospital by ID
 * Role: SUPER_ADMIN
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);

    const hospitalId = event.pathParameters?.id;
    if (!hospitalId) {
      return badRequest('Hospital ID is required');
    }

    const result = await hospitalWorkflow.getHospital(hospitalId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PUT /hospitals/{id}
 * Update hospital by ID
 * Role: SUPER_ADMIN
 */
module.exports.update = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);

    const hospitalId = event.pathParameters?.id;
    if (!hospitalId) {
      return badRequest('Hospital ID is required');
    }

    const body = parseBody(event);
    const result = await hospitalWorkflow.updateHospital(hospitalId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * DELETE /hospitals/{id}
 * Delete hospital by ID (soft delete)
 * Role: SUPER_ADMIN
 */
module.exports.delete = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN]);

    const hospitalId = event.pathParameters?.id;
    if (!hospitalId) {
      return badRequest('Hospital ID is required');
    }

    const result = await hospitalWorkflow.deleteHospital(hospitalId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

