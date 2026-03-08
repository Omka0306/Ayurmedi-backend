const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const apptSvc = require('../services/appointments.service');
const logger = require('../utils/logger.util');

const ALL_STAFF_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const parseBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

const parseQueryParams = (event) => event.queryStringParameters || {};

const handleError = (err) => {
  logger.error('Appointment handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * POST /appointments/book
 * Book an appointment
 * Role: Reception, Hospital Admin
 */
module.exports.book = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ['RECEPTION', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']);

    const body = parseBody(event);
    const result = await apptSvc.bookAppointment(body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /appointments/{id}
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const appointmentId = event.pathParameters?.id;
    if (!appointmentId) return badRequest('Appointment ID is required');

    const result = await apptSvc.getAppointment(appointmentId, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /appointments/list?date=2026-03-08
 * List appointments for a date
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const qp = parseQueryParams(event);
    const { date, limit, lastKey } = qp;

    const options = {
      limit: parseInt(limit) || 50,
      lastKey: lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null,
    };

    const result = await apptSvc.listByDate(date, options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /appointments/by-patient/{patient_id}
 * List all appointments for a patient
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

    const result = await apptSvc.listPatientAppointments(patientId, options, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /appointments/{id}/status
 * Update appointment status (CONFIRMED, ARRIVED, COMPLETED, CANCELLED, NO_SHOW)
 */
module.exports.updateStatus = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const appointmentId = event.pathParameters?.id;
    if (!appointmentId) return badRequest('Appointment ID is required');

    const body = parseBody(event);
    const result = await apptSvc.updateStatus(appointmentId, body, authContext);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};
