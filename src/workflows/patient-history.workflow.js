const patientHistoryService = require('../services/patient-history.service');

/**
 * Save patient history
 */
const saveHistory = async (visitId, payload, context) => {
  return patientHistoryService.savePatientHistory(
    visitId,
    payload,
    context.hospital_id,
    context.branch_id,
    context.user_id
  );
};

/**
 * Get visit history
 */
const getHistory = async (visitId, context) => {
  return patientHistoryService.getVisitHistory(visitId, context.hospital_id);
};

module.exports = {
  saveHistory,
  getHistory,
};
