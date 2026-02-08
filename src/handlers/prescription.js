const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const prescriptionWorkflow = require('../workflows/prescription.workflow');
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

module.exports.templateCreate = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR]);

    const body = parseBody(event);
    const result = await prescriptionWorkflow.createTemplate(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.templateList = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view templates
    const queryParams = parseQueryParams(event);
    const result = await prescriptionWorkflow.listTemplates(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.templateGet = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view templates
    const templateId = event.pathParameters?.id;
    if (!templateId) {
      return badRequest('Template ID is required');
    }

    const queryParams = parseQueryParams(event);
    const result = await prescriptionWorkflow.getTemplate(templateId, queryParams);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
