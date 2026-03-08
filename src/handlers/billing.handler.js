const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const billingWorkflow = require('../workflows/billing.workflow');
const logger = require('../utils/logger.util');

const BILLING_ROLES = ['RECEPTION', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const ALL_STAFF_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const parseBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

const parseQueryParams = (event) => event.queryStringParameters || {};

const handleError = (err) => {
  logger.error('Billing handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * POST /visits/{id}/bill
 * Create a bill for a visit
 * Role: Reception, Hospital Admin
 */
module.exports.create = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, BILLING_ROLES);

    const visitId = event.pathParameters?.id;
    if (!visitId) return badRequest('Visit ID is required');

    const body = parseBody(event);
    const result = await billingWorkflow.createBill(visitId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /billing/{id}
 * Get a bill by ID
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const billId = event.pathParameters?.id;
    if (!billId) return badRequest('Bill ID is required');

    const result = await billingWorkflow.getBillById(billId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /visits/{id}/bill
 * Get bill for a specific visit
 */
module.exports.getByVisit = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const visitId = event.pathParameters?.id;
    if (!visitId) return badRequest('Visit ID is required');

    const result = await billingWorkflow.getBillByVisit(visitId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /billing/{id}/pay
 * Update payment on a bill
 * Role: Reception, Hospital Admin
 */
module.exports.pay = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, BILLING_ROLES);

    const billId = event.pathParameters?.id;
    if (!billId) return badRequest('Bill ID is required');

    const body = parseBody(event);
    if (!body.paid_amount) return badRequest('paid_amount is required');
    
    const result = await billingWorkflow.payBill(billId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /billing/list
 * List hospital bills with optional filter ?payment_status=PENDING
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, BILLING_ROLES);

    const qp = parseQueryParams(event);
    const options = {
      limit: parseInt(qp.limit) || 20,
      lastKey: qp.lastKey ? JSON.parse(decodeURIComponent(qp.lastKey)) : null,
      payment_status: qp.payment_status || null,
    };

    const result = await billingWorkflow.listBills(options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /billing/by-patient/{patient_id}
 * List bills for a patient
 */
module.exports.listByPatient = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const patientId = event.pathParameters?.patient_id;
    if (!patientId) return badRequest('Patient ID is required');

    const qp = parseQueryParams(event);
    const options = {
      limit: parseInt(qp.limit) || 20,
      lastKey: qp.lastKey ? JSON.parse(decodeURIComponent(qp.lastKey)) : null,
    };

    const result = await billingWorkflow.listPatientBills(patientId, options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
