const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const medicineWorkflow = require('../workflows/medicine.workflow');
const logger = require('../utils/logger.util');

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('Invalid JSON body');
  }
};

const parseQueryParams = (event) => {
  const params = event.queryStringParameters || {};
  return params;
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
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const body = parseBody(event);
    const result = await medicineWorkflow.createMedicine(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view medicines
    const queryParams = parseQueryParams(event);
    const result = await medicineWorkflow.listMedicines(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.search = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can search medicines
    const queryParams = parseQueryParams(event);
    const searchQuery = queryParams.q || queryParams.query; // Accept both 'q' and 'query'
    if (!searchQuery) {
      return badRequest('Query parameter "q" or "query" is required');
    }
    
    const result = await medicineWorkflow.searchMedicines({ q: searchQuery }, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.updateStatus = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]);

    const medicineId = event.pathParameters?.id;
    if (!medicineId) {
      return badRequest('Medicine ID is required');
    }

    const body = parseBody(event);
    if (body.is_active === undefined) {
      return badRequest('is_active field is required');
    }

    const result = await medicineWorkflow.updateMedicineStatus(medicineId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.getByType = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    const result = await medicineWorkflow.getMedicinesGroupedByType(authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

