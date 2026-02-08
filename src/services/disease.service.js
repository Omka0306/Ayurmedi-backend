const { LANGUAGES } = require('../constants/config');
const { AppError } = require('../utils/error.util');
const { createDisease, getDiseaseById, listDiseases } = require('../persistence/disease.repo');

const createDiseaseRecord = async (payload, hospitalId) => {
  const { name_mr, name_en, description } = payload;

  if (!name_mr) {
    throw new AppError('name_mr is required', {
      statusCode: 400,
      code: 'DISEASE_VALIDATION',
    });
  }

  return createDisease({
    hospital_id: hospitalId,
    name_mr,
    name_en,
    description,
    is_active: true,
  });
};

const getDiseasesList = async (hospitalId, language = LANGUAGES.ENGLISH) => {
  const diseases = await listDiseases(hospitalId);
  
  return diseases.map((disease) => ({
    disease_id: disease.disease_id,
    name: language === LANGUAGES.MARATHI ? disease.name_mr : disease.name_en,
    description: disease.description,
  }));
};

module.exports = {
  createDiseaseRecord,
  getDiseasesList,
};
