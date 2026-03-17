const {
  createPlan, getPlanById, listPlansByPatient, listPlansByHospital, updatePlan,
  addSession, listSessionsByPlan, findSessionById, updateSession,
} = require('../persistence/panchakarma.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { adjustStock, addStockMovement } = require('../persistence/inventory.repo');
const { STOCK_MOVEMENT, PLAN_STATUS } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const createTreatmentPlan = async (payload, authContext) => {
  const { patient_id } = payload;
  if (!patient_id) throw new AppError('patient_id is required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const patient = await getPatientById(patient_id);
  if (!patient || patient.hospital_id !== authContext.hospital_id)
    throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });

  return createPlan({
    ...payload,
    hospital_id: authContext.hospital_id,
    branch_id:   authContext.branch_id || null,
    doctor_id:   authContext.user.user_id,
    doctor_name: authContext.user.full_name,
  });
};

const getPlan = async (planId, hospitalId) => {
  const plan = await getPlanById(planId);
  if (!plan) throw new AppError('Plan not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (plan.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return plan;
};

const listByPatient = async (patientId, hospitalId) => {
  const patient = await getPatientById(patientId);
  if (!patient || patient.hospital_id !== hospitalId)
    throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });
  return listPlansByPatient(patientId);
};

const logSession = async (planId, payload, authContext) => {
  const plan = await getPlanById(planId);
  if (!plan) throw new AppError('Plan not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (plan.hospital_id !== authContext.hospital_id) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });

  const sessions = await listSessionsByPlan(planId);
  const sessionNo = sessions.length + 1;

  const session = await addSession({
    ...payload,
    plan_id:    planId,
    session_no: sessionNo,
    therapist_id:   authContext.user.user_id,
    therapist_name: authContext.user.full_name,
  });

  // Auto-deduct materials used from inventory
  if (Array.isArray(payload.materials_used)) {
    await Promise.allSettled(
      payload.materials_used.filter((m) => m.item_id && m.qty_used).map(async (m) => {
        await adjustStock(m.item_id, -m.qty_used, authContext.hospital_id);
        await addStockMovement({
          item_id:        m.item_id,
          hospital_id:    authContext.hospital_id,
          movement_type:  STOCK_MOVEMENT.DISPENSED,
          quantity:       m.qty_used,
          reference_id:   session.session_id,
          reference_type: 'PK_SESSION',
          notes:          `Used in PK session #${sessionNo} for plan ${planId}`,
          created_by:     authContext.user.user_id,
        });
      })
    );
  }

  // Update completed_sessions count on plan
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length + 1;
  const isCompleted = completedCount >= plan.total_sessions;
  await updatePlan(planId, {
    completed_sessions: completedCount,
    ...(isCompleted ? { status: PLAN_STATUS.COMPLETED } : {}),
  });

  return session;
};

const getSessions = async (planId, hospitalId) => {
  const plan = await getPlanById(planId);
  if (!plan || plan.hospital_id !== hospitalId) throw new AppError('Plan not found', { statusCode: 404, code: 'NOT_FOUND' });
  return listSessionsByPlan(planId);
};

const editSession = async (planId, sessionId, updates, hospitalId) => {
  const plan = await getPlanById(planId);
  if (!plan || plan.hospital_id !== hospitalId) throw new AppError('Plan not found', { statusCode: 404, code: 'NOT_FOUND' });
  const disallowed = ['plan_id', 'session_id', 'session_no', 'created_at'];
  disallowed.forEach((k) => delete updates[k]);
  return updateSession(planId, sessionId, updates);
};

const editSessionBySessionId = async (sessionId, updates, hospitalId) => {
  const session = await findSessionById(sessionId);
  if (!session) throw new AppError('Session not found', { statusCode: 404, code: 'NOT_FOUND' });
  return editSession(session.plan_id, sessionId, updates, hospitalId);
};

module.exports = { createTreatmentPlan, getPlan, listByPatient, logSession, getSessions, editSession, editSessionBySessionId };
