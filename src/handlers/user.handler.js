const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const userWorkflow = require('../workflows/user.workflow');
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

module.exports.create = async (event) => {
  try {
    const authContext = await verifyJwtToken(
      event.headers.Authorization || event.headers.authorization,
    );
    roleGuard(authContext, [ROLES.HOSPITAL_ADMIN, ROLES.SUPER_ADMIN]); // SUPER_ADMIN should also be able to create? Maybe just HOSPITAL_ADMIN for now as per code.

    const body = parseBody(event);
    const user = await userWorkflow.createUser(body, authContext);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /users/list
 * List all users (Super Admin only) or hospital users (Hospital Admin)
 * actually workflow handles the logic based on role
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // Role guard: SUPER_ADMIN or HOSPITAL_ADMIN
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const queryParams = event.queryStringParameters || {};
    const options = {
      limit: parseInt(queryParams.limit) || 50,
      lastKey: queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null,
      role: queryParams.role,
    };

    const result = await userWorkflow.listUsers(options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /hospitals/{hospitalId}/users
 * List users by hospital
 */
module.exports.listByHospital = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const hospitalId = event.pathParameters?.hospitalId;
    if (!hospitalId) {
      return badRequest('Hospital ID is required');
    }

    const queryParams = event.queryStringParameters || {};
    const options = {
      limit: parseInt(queryParams.limit) || 50,
      lastKey: queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null,
      role: queryParams.role,
    };

    const result = await userWorkflow.listUsersByHospital(hospitalId, options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /users/{id}
 * Get user by ID
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const userId = event.pathParameters?.id;
    if (!userId) {
      return badRequest('User ID is required');
    }

    const result = await userWorkflow.getUserDetails(userId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PUT /users/{id}
 * Update user by ID
 */
module.exports.update = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const userId = event.pathParameters?.id;
    if (!userId) {
      return badRequest('User ID is required');
    }

    const body = parseBody(event);
    const result = await userWorkflow.updateUser(userId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * DELETE /users/{id}
 * Delete user by ID
 */
module.exports.delete = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const userId = event.pathParameters?.id;
    if (!userId) {
      return badRequest('User ID is required');
    }

    const result = await userWorkflow.deleteUser(userId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

