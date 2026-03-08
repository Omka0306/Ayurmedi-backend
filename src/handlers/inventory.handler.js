const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const inventoryWorkflow = require('../workflows/inventory.workflow');
const logger = require('../utils/logger.util');

const ADMIN_ROLES = ['HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const STAFF_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const parseBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

const parseQueryParams = (event) => event.queryStringParameters || {};

const handleError = (err) => {
  logger.error('Inventory handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * POST /inventory/stock-in
 * Add medicines to inventory (purchase / stock received)
 * Role: Hospital Admin, Super Admin
 */
module.exports.stockIn = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ADMIN_ROLES);

    const body = parseBody(event);
    const result = await inventoryWorkflow.addStock(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /inventory/list
 * List all inventory for the hospital
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, STAFF_ROLES);

    const qp = parseQueryParams(event);
    const options = {
      limit: parseInt(qp.limit) || 50,
      lastKey: qp.lastKey ? JSON.parse(decodeURIComponent(qp.lastKey)) : null,
    };

    const result = await inventoryWorkflow.listStock(options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /inventory/low-stock
 * Get medicines with stock at or below threshold
 */
module.exports.lowStock = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, STAFF_ROLES);

    const result = await inventoryWorkflow.getLowStock(authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /inventory/medicine/{medicine_id}
 * Get stock level for a specific medicine
 */
module.exports.getByMedicine = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, STAFF_ROLES);

    const medicineId = event.pathParameters?.medicine_id;
    if (!medicineId) return badRequest('Medicine ID is required');

    const result = await inventoryWorkflow.getMedicineStock(medicineId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /inventory/{id}/adjust
 * Manual stock adjustment (correction / expired removal)
 * Role: Hospital Admin, Super Admin
 */
module.exports.adjust = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ADMIN_ROLES);

    const inventoryId = event.pathParameters?.inventory_id;
    if (!inventoryId) return badRequest('Inventory ID is required');

    const body = parseBody(event);
    if (body.adjustment === undefined) return badRequest('adjustment is required (positive or negative number)');

    const result = await inventoryWorkflow.adjustInventory(inventoryId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
