const { AppError } = require('../utils/error.util');
const {
  createVisit,
  getVisitById,
  checkOpenVisit,
  getVisitsByStage,
  getVisitsByPatient,
  updateVisitStage,
  updateVisitStatus,
} = require('../persistence/visit.repo');
const { getPatientById } = require('../persistence/patient.repo');

/**
 * Create a new visit
 */
const createNewVisit = async (payload, hospitalId, branchId, createdBy) => {
  const {
    patient_id,
    doctor_id, // Optional - can be null
    visit_date,
    visit_time,
    weight,
    current_illness,
  } = payload;

  // Validate required fields
  if (!patient_id || !visit_date) {
    throw new AppError('patient_id and visit_date are required', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  // Verify patient exists and belongs to this hospital
  const patient = await getPatientById(patient_id);
  if (!patient) {
    throw new AppError('Patient not found', {
      statusCode: 404,
      code: 'PATIENT_NOT_FOUND',
    });
  }

  if (patient.hospital_id !== hospitalId) {
    throw new AppError('Patient does not belong to this hospital', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  // Check if patient already has an open visit
  const openVisit = await checkOpenVisit(patient_id);
  if (openVisit) {
    throw new AppError('Patient already has an open visit', {
      statusCode: 400,
      code: 'OPEN_VISIT_EXISTS',
    });
  }

  // Create visit
  const visit = await createVisit({
    hospital_id: hospitalId,
    branch_id: branchId,
    patient_id,
    doctor_id: doctor_id || null,
    visit_date,
    visit_time: visit_time || null,
    weight: weight || null,
    current_illness: current_illness || null,
    created_by: createdBy,
  });

  return { visit };
};

/**
 * Get visit by ID
 */
const getVisit = async (visitId, hospitalId) => {
  const visit = await getVisitById(visitId);

  if (!visit) {
    throw new AppError('Visit not found', {
      statusCode: 404,
      code: 'VISIT_NOT_FOUND',
    });
  }

  // Verify hospital isolation
  if (visit.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  return { visit };
};

/**
 * Get visits queue by stage
 */
const getVisitsQueue = async (hospitalId, stage) => {
  if (!stage) {
    throw new AppError('Stage parameter is required', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const validStages = ['WAITING_FOR_HISTORY', 'READY_FOR_DOCTOR', 'READY_FOR_BILLING'];
  if (!validStages.includes(stage)) {
    throw new AppError(`Invalid stage. Must be one of: ${validStages.join(', ')}`, {
      statusCode: 400,
      code: 'INVALID_STAGE',
    });
  }

  const visits = await getVisitsByStage(hospitalId, stage);
  return { visits, stage, count: visits.length };
};

/**
 * Get patient's visit history
 */
const getPatientVisitHistory = async (patientId, hospitalId) => {
  // First verify patient belongs to this hospital
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new AppError('Patient not found', {
      statusCode: 404,
      code: 'PATIENT_NOT_FOUND',
    });
  }

  if (patient.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  const visits = await getVisitsByPatient(patientId);
  return { visits };
};

/**
 * Update visit stage (internal use)
 */
const changeVisitStage = async (visitId, stage, hospitalId) => {
  // Verify visit belongs to hospital
  const { visit } = await getVisit(visitId, hospitalId);

  if (visit.status !== 'OPEN') {
    throw new AppError('Cannot update stage of closed visit', {
      statusCode: 400,
      code: 'VISIT_CLOSED',
    });
  }

  const updated = await updateVisitStage(visitId, stage);
  return { visit: updated };
};

/**
 * Complete a visit (Doctor only)
 */
const completeVisit = async (visitId, hospitalId) => {
  // Verify visit belongs to hospital
  const { visit } = await getVisit(visitId, hospitalId);

  if (visit.status !== 'OPEN') {
    throw new AppError('Visit is already closed', {
      statusCode: 400,
      code: 'VISIT_ALREADY_CLOSED',
    });
  }

  const updated = await updateVisitStatus(visitId, 'COMPLETED');
  return { visit: updated };
};

module.exports = {
  createNewVisit,
  getVisit,
  getVisitsQueue,
  getPatientVisitHistory,
  changeVisitStage,
  completeVisit,
};
