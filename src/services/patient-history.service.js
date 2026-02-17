const { AppError } = require('../utils/error.util');
const {
  createHistory,
  getHistoryByVisit,
  deleteHistoryByVisit,
} = require('../persistence/patient-history.repo');
const { getVisitById, updateVisitStage } = require('../persistence/visit.repo');

/**
 * Save patient history for a visit
 * ONE history per visit - overwrites existing
 */
const savePatientHistory = async (visitId, payload, hospitalId, branchId, createdBy) => {
  // Verify visit exists and belongs to hospital
  const visit = await getVisitById(visitId);
  if (!visit) {
    throw new AppError('Visit not found', {
      statusCode: 404,
      code: 'VISIT_NOT_FOUND',
    });
  }

  if (visit.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  // Only allow history for OPEN visits
  if (visit.status !== 'OPEN') {
    throw new AppError('Cannot add history to closed visit', {
      statusCode: 400,
      code: 'VISIT_CLOSED',
    });
  }

  // Delete existing history if any (ONE per visit rule)
  await deleteHistoryByVisit(visitId);

  // Create new history
  const history = await createHistory({
    visit_id: visitId,
    hospital_id: hospitalId,
    branch_id: branchId,
    created_by: createdBy,
    ...payload, // All history fields (purvrut, artava, etc.)
  });

  // Update visit stage to READY_FOR_DOCTOR
  await updateVisitStage(visitId, 'READY_FOR_DOCTOR');

  return { history, message: 'History saved successfully' };
};

/**
 * Get patient history for a visit
 */
const getVisitHistory = async (visitId, hospitalId) => {
  // Verify visit exists and belongs to hospital
  const visit = await getVisitById(visitId);
  if (!visit) {
    throw new AppError('Visit not found', {
      statusCode: 404,
      code: 'VISIT_NOT_FOUND',
    });
  }

  if (visit.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  const history = await getHistoryByVisit(visitId);
  
  if (!history) {
    return { history: null, message: 'No history found for this visit' };
  }

  return { history };
};

module.exports = {
  savePatientHistory,
  getVisitHistory,
};
