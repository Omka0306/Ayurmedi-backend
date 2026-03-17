const { saveFormConfig, getFormConfig, listFormConfigs } = require('../persistence/form-config.repo');
const { FORM_TYPE } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const validFormTypes = Object.values(FORM_TYPE);

const getConfig = async (hospitalId, formType) => {
  if (!validFormTypes.includes(formType)) {
    throw new AppError(`Invalid form type. Valid types: ${validFormTypes.join(', ')}`, {
      statusCode: 400, code: 'INVALID_FORM_TYPE',
    });
  }
  const config = await getFormConfig(hospitalId, formType);
  // Return default empty structure if not configured yet
  return config || {
    hospital_id: hospitalId,
    form_type: formType,
    fields: [],
    version: 0,
  };
};

const saveConfig = async (hospitalId, formType, payload) => {
  if (!validFormTypes.includes(formType)) {
    throw new AppError(`Invalid form type. Valid types: ${validFormTypes.join(', ')}`, {
      statusCode: 400, code: 'INVALID_FORM_TYPE',
    });
  }
  if (!Array.isArray(payload.fields)) {
    throw new AppError('fields must be an array', { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  // Validate field structure
  payload.fields.forEach((field, idx) => {
    if (!field.id || !field.label || !field.type) {
      throw new AppError(`Field at index ${idx} is missing id, label, or type`, {
        statusCode: 400, code: 'VALIDATION_ERROR',
      });
    }
  });

  const existing = await getFormConfig(hospitalId, formType);
  return saveFormConfig(hospitalId, formType, { ...payload, created_at: existing?.created_at });
};

const listConfigs = async (hospitalId) => listFormConfigs(hospitalId);

module.exports = { getConfig, saveConfig, listConfigs };
