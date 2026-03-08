const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const formFieldWorkflow = require('../workflows/form-field.workflow');
const logger = require('../utils/logger.util');

const ADMIN_ROLES = ['HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const ALL_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const parseBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

const parseQueryParams = (event) => event.queryStringParameters || {};

const handleError = (err) => {
  logger.error('Form handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * GET /forms/schema?form_type=RECEPTION&lang=en
 * Role: All authenticated users
 */
module.exports.getSchema = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_ROLES);

    const queryParams = parseQueryParams(event);
    const result = await formFieldWorkflow.getFormSchema(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /forms/fields/upsert
 * Role: Hospital Admin, Super Admin
 * Creates or updates a form field for a hospital.
 * Super Admin can create GLOBAL fields by passing hospital_id = "GLOBAL".
 */
module.exports.upsertField = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ADMIN_ROLES);

    const body = parseBody(event);
    const result = await formFieldWorkflow.upsertFormField(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /forms/fields/{field_id}/toggle
 * Role: Hospital Admin, Super Admin
 * Enable or disable a field for this hospital.
 */
module.exports.toggleField = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ADMIN_ROLES);

    const fieldId = event.pathParameters?.field_id;
    if (!fieldId) return badRequest('field_id is required');

    const result = await formFieldWorkflow.toggleFormField(fieldId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /forms/fields?form_type=RECEPTION&hospital_id=
 * Role: Hospital Admin, Super Admin
 * List all fields for a hospital (admin management view).
 */
module.exports.listFields = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ADMIN_ROLES);

    const queryParams = parseQueryParams(event);
    const result = await formFieldWorkflow.listFieldsByHospital(queryParams, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
