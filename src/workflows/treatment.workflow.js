const treatmentService = require('../services/treatment.service');

const createTreatment = async (payload, context) => {
  return treatmentService.createTreatmentRecord(payload, context.hospital_id);
};

const listTreatmentsByDisease = async (diseaseId, queryParams, context) => {
  const language = queryParams.lang || 'en';
  return treatmentService.getTreatmentsByDisease(diseaseId, context.hospital_id, language);
};

module.exports = {
  createTreatment,
  listTreatmentsByDisease,
};
