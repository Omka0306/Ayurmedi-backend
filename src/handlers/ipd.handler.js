const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const {
  admitPatient,
  getIpdById,
  listActiveIpd,
  listIpdByPatient,
  addIpdNote,
  dischargePatient,
} = require('../persistence/ipd.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { AppError } = require('../utils/error.util');
const logger = require('../utils/logger.util');

const DOCTOR_ADMIN_ROLES = ['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const ALL_STAFF_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const parseBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

const parseQueryParams = (event) => event.queryStringParameters || {};

const handleError = (err) => {
  logger.error('IPD handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * POST /ipd/admit
 * Admit a patient for inpatient care
 * Role: Doctor, Hospital Admin
 */
module.exports.admit = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const body = parseBody(event);
    const { patient_id, ward, bed_number, doctor_id, diagnosis, treatment_plan, notes } = body;

    if (!patient_id) return badRequest('patient_id is required');

    const patient = await getPatientById(patient_id);
    if (!patient) throw new AppError('Patient not found', { statusCode: 404 });
    if (patient.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Patient does not belong to your hospital', { statusCode: 403 });
    }

    const record = await admitPatient({
      hospital_id: authContext.hospital_id,
      patient_id,
      ward: ward || null,
      bed_number: bed_number || null,
      doctor_id: doctor_id || authContext.user_id,
      diagnosis: diagnosis || null,
      treatment_plan: treatment_plan || null,
      notes: notes ? [{ text: notes, recorded_at: new Date().toISOString() }] : [],
    });

    return ok(record);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /ipd/{ipd_id}
 * Get IPD record
 */
module.exports.getById = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const ipd_id = event.pathParameters?.ipd_id;
    if (!ipd_id) return badRequest('IPD ID is required');

    const record = await getIpdById(ipd_id);
    if (!record) throw new AppError('IPD record not found', { statusCode: 404 });
    if (record.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Access denied', { statusCode: 403 });
    }

    return ok(record);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /ipd/list
 * List all currently admitted patients
 */
module.exports.list = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const qp = parseQueryParams(event);
    const options = {
      limit: parseInt(qp.limit) || 50,
      lastKey: qp.lastKey ? JSON.parse(decodeURIComponent(qp.lastKey)) : null,
    };

    const result = await listActiveIpd(authContext.hospital_id, options);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /ipd/by-patient/{patient_id}
 * List all IPD admissions for a patient
 */
module.exports.listByPatient = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const patient_id = event.pathParameters?.patient_id;
    if (!patient_id) return badRequest('Patient ID is required');

    const qp = parseQueryParams(event);
    const options = { limit: parseInt(qp.limit) || 20 };
    const result = await listIpdByPatient(patient_id, options);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /ipd/{ipd_id}/note
 * Add a daily note/observation
 * Role: Doctor, Hospital Admin
 */
module.exports.addNote = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const ipd_id = event.pathParameters?.ipd_id;
    if (!ipd_id) return badRequest('IPD ID is required');

    const body = parseBody(event);
    if (!body.text) return badRequest('text is required for note');

    const updated = await addIpdNote(ipd_id, { text: body.text, added_by: authContext.user_id });
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /ipd/{ipd_id}/discharge
 * Discharge a patient
 * Role: Doctor, Hospital Admin
 */
module.exports.discharge = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const ipd_id = event.pathParameters?.ipd_id;
    if (!ipd_id) return badRequest('IPD ID is required');

    const body = parseBody(event);
    const record = await dischargePatient(ipd_id, body);
    return ok(record);
  } catch (err) {
    return handleError(err);
  }
};
