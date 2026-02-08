const { LANGUAGES } = require('../constants/config');
const { AppError } = require('../utils/error.util');
const {
  createPrescriptionTemplate,
  getPrescriptionTemplateById,
  listPrescriptionTemplates,
} = require('../persistence/prescription.repo');
const { getDiseaseById } = require('../persistence/disease.repo');
const { getTreatmentById } = require('../persistence/treatment.repo');
const { getMedicineById } = require('../persistence/medicine.repo');

const createPrescriptionTemplateRecord = async (payload, hospitalId, createdBy) => {
  const { disease_id, treatment_id, medicines, instructions_mr, instructions_en } = payload;

  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    throw new AppError('medicines array is required and must not be empty', {
      statusCode: 400,
      code: 'PRESCRIPTION_TEMPLATE_VALIDATION',
    });
  }

  // Validate disease if provided
  if (disease_id) {
    const disease = await getDiseaseById(disease_id);
    if (!disease) {
      throw new AppError('Disease not found', {
        statusCode: 404,
        code: 'DISEASE_NOT_FOUND',
      });
    }
  }

  // Validate treatment if provided
  if (treatment_id) {
    const treatment = await getTreatmentById(treatment_id);
    if (!treatment) {
      throw new AppError('Treatment not found', {
        statusCode: 404,
        code: 'TREATMENT_NOT_FOUND',
      });
    }
  }

  // Validate all medicines exist
  for (const med of medicines) {
    if (!med.medicine_id) {
      throw new AppError('Each medicine must have medicine_id', {
        statusCode: 400,
        code: 'MEDICINE_VALIDATION',
      });
    }
    const medicine = await getMedicineById(med.medicine_id);
    if (!medicine) {
      throw new AppError(`Medicine ${med.medicine_id} not found`, {
        statusCode: 404,
        code: 'MEDICINE_NOT_FOUND',
      });
    }
  }

  return createPrescriptionTemplate({
    hospital_id: hospitalId,
    disease_id,
    treatment_id,
    medicines,
    instructions_mr,
    instructions_en,
    created_by: createdBy,
  });
};

const getPrescriptionTemplatesList = async (hospitalId, filters = {}, language = LANGUAGES.ENGLISH) => {
  const templates = await listPrescriptionTemplates(hospitalId, filters);
  
  return templates.map((template) => ({
    template_id: template.template_id,
    disease_id: template.disease_id,
    treatment_id: template.treatment_id,
    medicines: template.medicines,
    instructions: language === LANGUAGES.MARATHI ? template.instructions_mr : template.instructions_en,
    created_by: template.created_by,
    created_at: template.created_at,
  }));
};

const getPrescriptionTemplate = async (templateId, language = LANGUAGES.ENGLISH) => {
  const template = await getPrescriptionTemplateById(templateId);
  
  if (!template) {
    throw new AppError('Prescription template not found', {
      statusCode: 404,
      code: 'TEMPLATE_NOT_FOUND',
    });
  }

  return {
    template_id: template.template_id,
    disease_id: template.disease_id,
    treatment_id: template.treatment_id,
    medicines: template.medicines,
    instructions: language === LANGUAGES.MARATHI ? template.instructions_mr : template.instructions_en,
    created_by: template.created_by,
    created_at: template.created_at,
  };
};

module.exports = {
  createPrescriptionTemplateRecord,
  getPrescriptionTemplatesList,
  getPrescriptionTemplate,
};
