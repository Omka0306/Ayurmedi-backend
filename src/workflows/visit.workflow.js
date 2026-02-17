const visitService = require('../services/visit.service');

/**
 * Create a new visit
 */
const createVisit = async (payload, context) => {
  return visitService.createNewVisit(
    payload,
    context.hospital_id,
    context.branch_id,
    context.user_id
  );
};

/**
 * Get visits queue by stage
 */
const getQueue = async (stage, context) => {
  return visitService.getVisitsQueue(context.hospital_id, stage);
};

/**
 * Get visit by ID
 */
const getVisitById = async (visitId, context) => {
  return visitService.getVisit(visitId, context.hospital_id);
};

/**
 * Get patient's visit history
 */
const getPatientVisits = async (patientId, context) => {
  return visitService.getPatientVisitHistory(patientId, context.hospital_id);
};

/**
 * Update visit stage (internal)
 */
const updateStage = async (visitId, stage, context) => {
  return visitService.changeVisitStage(visitId, stage, context.hospital_id);
};

/**
 * Complete visit
 */
const completeVisit = async (visitId, context) => {
  return visitService.completeVisit(visitId, context.hospital_id);
};

module.exports = {
  createVisit,
  getQueue,
  getVisitById,
  getPatientVisits,
  updateStage,
  completeVisit,
};
