const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const {
  createPlan,
  getPlanById,
  listPlansByHospital,
  listPlansByPatient,
  addSession,
  updatePlanStatus,
} = require('../persistence/panchakarma.repo');
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
  logger.error('Panchakarma handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * POST /panchakarma/plan
 * Create a new Panchakarma treatment plan for a patient
 * Role: Doctor, Hospital Admin
 */
module.exports.createPlan = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const body = parseBody(event);
    const {
      patient_id,
      treatment_type,   // e.g. "Vamana", "Virechana", "Basti", "Nasya", "Raktamokshana"
      total_days,       // planned duration
      start_date,
      diet_plan,
      pre_treatment,    // Poorvakarma instructions
      notes,
    } = body;

    if (!patient_id || !treatment_type) {
      return badRequest('patient_id and treatment_type are required');
    }

    const patient = await getPatientById(patient_id);
    if (!patient) throw new AppError('Patient not found', { statusCode: 404 });
    if (patient.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Patient does not belong to your hospital', { statusCode: 403 });
    }

    const plan = await createPlan({
      hospital_id: authContext.hospital_id,
      patient_id,
      doctor_id: authContext.user_id,
      treatment_type,
      total_days: total_days || null,
      start_date: start_date || new Date().toISOString().split('T')[0],
      diet_plan: diet_plan || null,
      pre_treatment: pre_treatment || null,
      notes: notes || null,
    });

    return ok(plan);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /panchakarma/{plan_id}
 * Get a Panchakarma plan by ID
 */
module.exports.getPlan = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const plan_id = event.pathParameters?.plan_id;
    if (!plan_id) return badRequest('Plan ID is required');

    const plan = await getPlanById(plan_id);
    if (!plan) throw new AppError('Panchakarma plan not found', { statusCode: 404 });
    if (plan.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Access denied', { statusCode: 403 });
    }

    return ok(plan);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /panchakarma/list
 * List all Panchakarma plans for the hospital
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

    const result = await listPlansByHospital(authContext.hospital_id, options);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /panchakarma/by-patient/{patient_id}
 * List Panchakarma plans for a patient
 */
module.exports.listByPatient = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const patient_id = event.pathParameters?.patient_id;
    if (!patient_id) return badRequest('Patient ID is required');

    const qp = parseQueryParams(event);
    const options = { limit: parseInt(qp.limit) || 20 };
    const result = await listPlansByPatient(patient_id, options);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * POST /panchakarma/{plan_id}/session
 * Log a Panchakarma session (daily treatment)
 * Role: Doctor, Hospital Admin
 */
module.exports.addSession = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const plan_id = event.pathParameters?.plan_id;
    if (!plan_id) return badRequest('Plan ID is required');

    const body = parseBody(event);
    const {
      day_number,        // Session day number
      procedure_done,    // What was done
      therapist,         // Who performed
      observations,      // Doctor observations
      oils_used,         // Oils/herbs used
      duration_minutes,  // Session duration
    } = body;

    if (!day_number || !procedure_done) {
      return badRequest('day_number and procedure_done are required');
    }

    const updated = await addSession(plan_id, {
      day_number,
      procedure_done,
      therapist: therapist || null,
      observations: observations || null,
      oils_used: oils_used || null,
      duration_minutes: duration_minutes || null,
      recorded_by: authContext.user_id,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
};

/**
 * PATCH /panchakarma/{plan_id}/complete
 * Mark Panchakarma plan as completed
 * Role: Doctor, Hospital Admin
 */
module.exports.completePlan = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, DOCTOR_ADMIN_ROLES);

    const plan_id = event.pathParameters?.plan_id;
    if (!plan_id) return badRequest('Plan ID is required');

    const body = parseBody(event);
    const status = body.status || 'COMPLETED';
    if (!['COMPLETED', 'CANCELLED'].includes(status)) {
      return badRequest('status must be COMPLETED or CANCELLED');
    }

    const updated = await updatePlanStatus(plan_id, status, body.notes || null);
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
};
