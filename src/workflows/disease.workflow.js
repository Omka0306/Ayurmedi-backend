const diseaseService = require('../services/disease.service');

const createDisease = async (payload, context) => {
  return diseaseService.createDiseaseRecord(payload, context.hospital_id);
};

const listDiseases = async (queryParams, context) => {
  const language = queryParams.lang || 'en';
  return diseaseService.getDiseasesList(context.hospital_id, language);
};

module.exports = {
  createDisease,
  listDiseases,
};
