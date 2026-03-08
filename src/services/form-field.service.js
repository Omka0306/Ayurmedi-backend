const formFieldRepo = require('../persistence/form-field.repo');
const { AppError } = require('../utils/error.util');

const VALID_FORM_TYPES = ['RECEPTION', 'HISTORY', 'PRESCRIPTION'];
const VALID_INPUT_TYPES = [
  'text', 'number', 'date', 'time', 'email', 'phone',
  'select', 'multi_select', 'textarea', 'checkbox', 'computed',
];
const VALID_HOSPITAL_TYPES = ['AYURVEDIC', 'ALLOPATHY', 'ALL'];

/**
 * Get the form schema for a hospital.
 * Merges GLOBAL defaults with hospital-specific overrides.
 * Groups fields into sections and applies language.
 */
const getFormSchema = async (hospital_id, form_type, lang = 'en') => {
  if (!VALID_FORM_TYPES.includes(form_type)) {
    throw new AppError(`Invalid form_type. Must be one of: ${VALID_FORM_TYPES.join(', ')}`, 400, 'INVALID_FORM_TYPE');
  }

  const fields = await formFieldRepo.getFormSchema(hospital_id, form_type);

  // Group into sections
  const sectionMap = {};
  const sectionOrder = [];

  fields.forEach((field) => {
    const sectionKey = field.section || 'general';
    if (!sectionMap[sectionKey]) {
      sectionMap[sectionKey] = [];
      sectionOrder.push({
        key: sectionKey,
        label: lang === 'mr' ? (field.section_label_mr || sectionKey) : (field.section_label_en || sectionKey),
        sort_order: field.section_sort_order || 99,
      });
    }

    sectionMap[sectionKey].push({
      field_id: field.field_id,
      field_key: field.field_key,
      label: lang === 'mr' ? (field.label_mr || field.label_en) : (field.label_en || field.label_mr),
      placeholder: lang === 'mr' ? (field.placeholder_mr || '') : (field.placeholder_en || ''),
      input_type: field.input_type,
      is_required: field.is_required || false,
      sort_order: field.sort_order || 99,
      validation: field.validation || null,
      options_source: field.options_source || null,
      options: field.options || null,       // inline options (for select/multi_select)
      default_value: field.default_value || null,
      hospital_type: field.hospital_type || 'ALL',
      is_hospital_specific: field.hospital_id !== 'GLOBAL',
    });
  });

  // Sort sections
  const sections = sectionOrder
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      section: s.key,
      label: s.label,
      fields: (sectionMap[s.key] || []).sort((a, b) => a.sort_order - b.sort_order),
    }));

  return {
    form_type,
    hospital_id,
    language: lang,
    sections,
    total_fields: fields.length,
  };
};

/**
 * Upsert a field: Hospital Admin creates or overrides a field for their hospital.
 * SUPER_ADMIN can create GLOBAL fields.
 */
const upsertFormField = async (payload, authContext) => {
  const {
    hospital_id: callerHospitalId,
    role,
  } = authContext;

  // Determine target hospital_id
  let targetHospitalId;
  if (role === 'SUPER_ADMIN' && payload.hospital_id === 'GLOBAL') {
    targetHospitalId = 'GLOBAL';
  } else {
    targetHospitalId = callerHospitalId;
  }

  // Validate required fields
  const { form_type, field_key, label_en, input_type } = payload;
  if (!form_type || !field_key || !label_en || !input_type) {
    throw new AppError('form_type, field_key, label_en, and input_type are required', 400, 'MISSING_REQUIRED_FIELDS');
  }

  if (!VALID_FORM_TYPES.includes(form_type)) {
    throw new AppError(`Invalid form_type. Must be one of: ${VALID_FORM_TYPES.join(', ')}`, 400, 'INVALID_FORM_TYPE');
  }

  if (!VALID_INPUT_TYPES.includes(input_type)) {
    throw new AppError(`Invalid input_type. Must be one of: ${VALID_INPUT_TYPES.join(', ')}`, 400, 'INVALID_INPUT_TYPE');
  }

  if (payload.hospital_type && !VALID_HOSPITAL_TYPES.includes(payload.hospital_type)) {
    throw new AppError(`Invalid hospital_type. Must be one of: ${VALID_HOSPITAL_TYPES.join(', ')}`, 400, 'INVALID_HOSPITAL_TYPE');
  }

  const fieldData = {
    hospital_id: targetHospitalId,
    form_type,
    field_key: field_key.toLowerCase().replace(/\s+/g, '_'),
    label_en,
    label_mr: payload.label_mr || null,
    placeholder_en: payload.placeholder_en || null,
    placeholder_mr: payload.placeholder_mr || null,
    input_type,
    is_required: payload.is_required || false,
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    sort_order: payload.sort_order || 99,
    section: payload.section || 'general',
    section_label_en: payload.section_label_en || null,
    section_label_mr: payload.section_label_mr || null,
    section_sort_order: payload.section_sort_order || 99,
    validation: payload.validation || null,
    options_source: payload.options_source || null,
    options: payload.options || null,
    default_value: payload.default_value || null,
    hospital_type: payload.hospital_type || 'ALL',
  };

  const result = await formFieldRepo.upsertFormField(fieldData);
  return { field: result };
};

/**
 * Toggle a field's is_active flag.
 * Hospital can only toggle their own fields, not GLOBAL ones.
 */
const toggleFormField = async (field_id, authContext) => {
  const { hospital_id, role } = authContext;

  const field = await formFieldRepo.getFieldById(field_id);
  if (!field) {
    throw new AppError('Form field not found', 404, 'FIELD_NOT_FOUND');
  }

  // Super admin can toggle any field. Hospital admin can only toggle their own.
  if (role !== 'SUPER_ADMIN' && field.hospital_id !== hospital_id) {
    throw new AppError('You can only toggle fields belonging to your hospital', 403, 'FORBIDDEN');
  }

  const updated = await formFieldRepo.toggleFormField(field_id, role === 'SUPER_ADMIN' ? field.hospital_id : hospital_id);
  if (!updated) {
    throw new AppError('Could not toggle field', 500, 'TOGGLE_FAILED');
  }

  return { field: updated };
};

/**
 * List fields by hospital (for Admin management view).
 */
const listFieldsByHospital = async (hospital_id, form_type, authContext) => {
  if (!VALID_FORM_TYPES.includes(form_type)) {
    throw new AppError(`Invalid form_type. Must be one of: ${VALID_FORM_TYPES.join(', ')}`, 400, 'INVALID_FORM_TYPE');
  }

  const fields = await formFieldRepo.listFieldsByHospital(hospital_id, form_type);
  return { fields, total: fields.length };
};

module.exports = {
  getFormSchema,
  upsertFormField,
  toggleFormField,
  listFieldsByHospital,
};
