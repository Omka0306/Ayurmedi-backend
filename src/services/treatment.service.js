const { LANGUAGES } = require('../constants/config');
const { AppError } = require('../utils/error.util');
const { createTreatment, getTreatmentById, listTreatmentsByDisease } = require('../persistence/treatment.repo');
const { getDiseaseById } = require('../persistence/disease.repo');

const createTreatmentRecord = async (payload, hospitalId) => {
  const { disease_id, title_mr, title_en, notes } = payload;

  if (!disease_id || !title_mr) {
    throw new AppError('disease_id and title_mr are required', {
      statusCode: 400,
      code: 'TREATMENT_VALIDATION',
    });
  }

  // Verify disease exists
  const disease = await getDiseaseById(disease_id);
  if (!disease) {
    throw new AppError('Disease not found', {
      statusCode: 404,
      code: 'DISEASE_NOT_FOUND',
    });
  }

  return createTreatment({
    disease_id,
    hospital_id: hospitalId,
    title_mr,
    title_en,
    notes,
  });
};

const getTreatmentsByDisease = async (diseaseId, hospitalId, language = LANGUAGES.ENGLISH) => {
  const treatments = await listTreatmentsByDisease(diseaseId, hospitalId);
  
  return treatments.map((treatment) => ({
    treatment_id: treatment.treatment_id,
    disease_id: treatment.disease_id,
    title: language === LANGUAGES.MARATHI ? treatment.title_mr : treatment.title_en,
    notes: treatment.notes,
  }));
};

module.exports = {
  createTreatmentRecord,
  getTreatmentsByDisease,
};
