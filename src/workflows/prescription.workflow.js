const prescriptionService = require('../services/prescription.service');

const createTemplate = async (payload, context) => {
  return prescriptionService.createPrescriptionTemplateRecord(
    payload,
    context.hospital_id,
    context.user.user_id,
  );
};

const listTemplates = async (queryParams, context) => {
  const language = queryParams.lang || 'en';
  const filters = {};
  if (queryParams.disease_id) filters.disease_id = queryParams.disease_id;
  if (queryParams.created_by) filters.created_by = queryParams.created_by;
  
  return prescriptionService.getPrescriptionTemplatesList(context.hospital_id, filters, language);
};

const getTemplate = async (templateId, queryParams) => {
  const language = queryParams.lang || 'en';
  return prescriptionService.getPrescriptionTemplate(templateId, language);
};

module.exports = {
  createTemplate,
  listTemplates,
  getTemplate,
};
