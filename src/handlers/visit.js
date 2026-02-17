const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const visitWorkflow = require('../workflows/visit.workflow');
const patientHistoryWorkflow = require('../workflows/patient-history.workflow');
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
  logger.error('Visit handler error:', err);
  if (isAppError(err)) {
    return toHttpResponse(err);
  }
  return serverError('An unexpected error occurred');
};

/**
 * POST /visits/create
 * Role: Reception OR Doctor
 */
module.exports.create = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Check role: Reception OR Doctor OR Super Admin
    roleGuard(authContext, ['RECEPTION', 'DOCTOR', 'SUPER_ADMIN']);

    const body = parseBody(event);
    const result = await visitWorkflow.createVisit(body, authContext);
    
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/queue?stage=WAITING_FOR_HISTORY
 */
module.exports.queue = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const queryParams = parseQueryParams(event);
    const stage = queryParams.stage;

    if (!stage) {
      return badRequest('stage query parameter is required');
    }

    const result = await visitWorkflow.getQueue(stage, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/{id}
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const result = await visitWorkflow.getVisitById(visitId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/by-patient/{patient_id}
 */
module.exports.byPatient = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const patientId = event.pathParameters?.patient_id;
    if (!patientId) {
      return badRequest('Patient ID is required');
    }

    const result = await visitWorkflow.getPatientVisits(patientId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /visits/{id}/complete
 * Role: Doctor only
 */
module.exports.complete = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Only Doctor can complete visits (Super Admin for testing)
    roleGuard(authContext, ['DOCTOR', 'SUPER_ADMIN']);

    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const result = await visitWorkflow.completeVisit(visitId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /visits/{id}/history
 * Role: Assistant OR Doctor
 */
module.exports.saveHistory = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Check role: Assistant OR Doctor OR Super Admin
    roleGuard(authContext, ['ASSISTANT', 'DOCTOR', 'SUPER_ADMIN']);

    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const body = parseBody(event);
    const result = await patientHistoryWorkflow.saveHistory(visitId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/{id}/history
 */
module.exports.getHistory = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const result = await patientHistoryWorkflow.getHistory(visitId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
