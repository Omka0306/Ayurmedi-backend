const visitPrescriptionService = require('../services/visit-prescription.service');

/**
 * Create prescription for a visit
 */
const createPrescription = async (visitId, payload, context) => {
  return visitPrescriptionService.createPrescriptionForVisit(
    visitId,
    payload,
    context.user_id // doctor_id
  );
};

/**
 * Get prescription with items
 */
const getPrescription = async (visitId) => {
  return visitPrescriptionService.getVisitPrescriptionWithItems(visitId);
};

/**
 * Add medicine item to prescription
 */
const addItem = async (prescriptionId, payload) => {
  return visitPrescriptionService.addMedicineToPrescription(prescriptionId, payload);
};

/**
 * Remove medicine item  
 */
const removeItem = async (itemId) => {
  return visitPrescriptionService.removeMedicineFromPrescription(itemId);
};

/**
 * Get complete visit summary
 */
const getVisitSummary = async (visitId, context) => {
  return visitPrescriptionService.getCompleteVisitSummary(visitId, context.hospital_id);
};

module.exports = {
  createPrescription,
  getPrescription,
  addItem,
  removeItem,
  getVisitSummary,
};
