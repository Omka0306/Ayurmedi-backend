const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const visitPrescriptionWorkflow = require('../workflows/visit-prescription.workflow');
const logger = require('../utils/logger.util');

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const handleError = (err) => {
  logger.error('Prescription handler error:', err);
  if (isAppError(err)) {
    return toHttpResponse(err);
  }
  return serverError('An unexpected error occurred');
};

/**
 * POST /visits/{id}/prescription
 * Role: Doctor only
 */
module.exports.create = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Only Doctor can create prescriptions (Super Admin for testing)
    roleGuard(authContext, ['DOCTOR', 'SUPER_ADMIN']);

    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const body = parseBody(event);
    const result = await visitPrescriptionWorkflow.createPrescription(visitId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/{id}/prescription
 */
module.exports.get = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const result = await visitPrescriptionWorkflow.getPrescription(visitId);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /prescriptions/{id}/items
 * Role: Doctor only
 */
module.exports.addItem = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Only Doctor can add items (Super Admin for testing)
    roleGuard(authContext, ['DOCTOR', 'SUPER_ADMIN']);

    const prescriptionId = event.pathParameters?.id;
    if (!prescriptionId) {
      return badRequest('Prescription ID is required');
    }

    const body = parseBody(event);
    const result = await visitPrescriptionWorkflow.addItem(prescriptionId, body);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * DELETE /prescriptions/item/{item_id}
 * Role: Doctor only
 */
module.exports.removeItem = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    // Only Doctor can remove items (Super Admin for testing)
    roleGuard(authContext, ['DOCTOR', 'SUPER_ADMIN']);

    const itemId = event.pathParameters?.item_id;
    if (!itemId) {
      return badRequest('Item ID is required');
    }

    const result = await visitPrescriptionWorkflow.removeItem(itemId);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/{id}/summary
 * Complete visit summary with patient, visit, history, prescription, items
 */
module.exports.summary = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    
    const visitId = event.pathParameters?.id;
    if (!visitId) {
      return badRequest('Visit ID is required');
    }

    const result = await visitPrescriptionWorkflow.getVisitSummary(visitId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
