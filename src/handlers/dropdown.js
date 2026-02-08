const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const dropdownWorkflow = require('../workflows/dropdown.workflow');
const logger = require('../utils/logger.util');

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

module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view dropdowns
    const queryParams = parseQueryParams(event);
    const result = await dropdownWorkflow.listDropdowns(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.options = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    // All authenticated users can view dropdown options
    const dropdownCode = event.pathParameters?.dropdown_code;
    if (!dropdownCode) {
      return badRequest('dropdown_code is required');
    }

    const queryParams = parseQueryParams(event);
    const result = await dropdownWorkflow.getDropdownOptions(dropdownCode, queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.getAllWithOptions = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    const queryParams = parseQueryParams(event);
    const result = await dropdownWorkflow.getAllDropdownsWithOptions(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.createCategory = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [require('../constants/config').ROLES.SUPER_ADMIN, require('../constants/config').ROLES.HOSPITAL_ADMIN]);
    
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await dropdownWorkflow.createDropdownCategory(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.createOption = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, [require('../constants/config').ROLES.SUPER_ADMIN, require('../constants/config').ROLES.HOSPITAL_ADMIN]);
    
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await dropdownWorkflow.createDropdownOption(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

