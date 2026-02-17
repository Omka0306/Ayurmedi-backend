const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const patientWorkflow = require('../workflows/patient.workflow');
const logger = require('../utils/logger.util');

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const parseQueryParams = (event) => {
  return event.queryStringParameters || {};
};

const handleError = (err) => {
  logger.error('Patient handler error:', err);
  if (isAppError(err)) {
    return toHttpResponse(err);
  }
  return serverError('An unexpected error occurred');
};

/**
 * POST /patients/register
 * Role: Reception OR Doctor
 */
module.exports.register = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Check role: Reception OR Doctor OR Super Admin
    roleGuard(authContext, ['RECEPTION', 'DOCTOR', 'SUPER_ADMIN']);

    const body = parseBody(event);
    const result = await patientWorkflow.registerPatient(body, authContext);
    
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /patients/search?mobile=
 */
module.exports.search = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const queryParams = parseQueryParams(event);
    const searchQuery = queryParams.mobile || queryParams.q || queryParams.query;
    
    if (!searchQuery) {
      return badRequest('Search query parameter required (mobile, q, or query)');
    }

    const result = await patientWorkflow.searchPatients(searchQuery, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /patients/list
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const queryParams = parseQueryParams(event);
    const options = {
      limit: parseInt(queryParams.limit) || 20,
      lastKey: queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null,
    };

    const result = await patientWorkflow.listPatients(options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /patients/{id}
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const patientId = event.pathParameters?.id;
    if (!patientId) {
      return badRequest('Patient ID is required');
    }

    const result = await patientWorkflow.getPatientById(patientId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
