const formFieldService = require('../services/form-field.service');

const getFormSchema = async (queryParams, authContext) => {
  const { form_type = 'RECEPTION', lang = 'en' } = queryParams;
  const { hospital_id } = authContext;
  return formFieldService.getFormSchema(hospital_id, form_type.toUpperCase(), lang);
};

const upsertFormField = async (body, authContext) => {
  return formFieldService.upsertFormField(body, authContext);
};

const toggleFormField = async (field_id, authContext) => {
  return formFieldService.toggleFormField(field_id, authContext);
};

const listFieldsByHospital = async (queryParams, authContext) => {
  const { form_type = 'RECEPTION', hospital_id: queryHospitalId } = queryParams;
  const { hospital_id: callerHospitalId, role } = authContext;

  // SUPER_ADMIN can query any hospital or GLOBAL
  const targetHospital = (role === 'SUPER_ADMIN' && queryHospitalId) ? queryHospitalId : callerHospitalId;
  return formFieldService.listFieldsByHospital(targetHospital, form_type.toUpperCase(), authContext);
};

module.exports = {
  getFormSchema,
  upsertFormField,
  toggleFormField,
  listFieldsByHospital,
};
