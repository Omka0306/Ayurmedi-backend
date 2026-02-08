const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const treatmentWorkflow = require('../workflows/treatment.workflow');
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
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR]);

    const body = parseBody(event);
    const result = await treatmentWorkflow.createTreatment(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.listByDisease = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view treatments
    const diseaseId = event.pathParameters?.disease_id;
    if (!diseaseId) {
      return badRequest('disease_id is required');
    }

    const queryParams = parseQueryParams(event);
    const result = await treatmentWorkflow.listTreatmentsByDisease(diseaseId, queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
