const { LANGUAGES } = require('../constants/config');
const { AppError } = require('../utils/error.util');
const {
  createDropdownCategory,
  getDropdownByCode,
  listAllDropdowns,
  createDropdownOption,
  getOptionsByDropdownId,
} = require('../persistence/dropdown.repo');

const createDropdownCategoryRecord = async (payload, hospitalId) => {
  const { dropdown_code, label_mr, label_en, section_name, input_type, sort_order } = payload;

  if (!dropdown_code || !label_mr) {
    throw new AppError('dropdown_code and label_mr are required', {
      statusCode: 400,
      code: 'DROPDOWN_VALIDATION',
    });
  }

  return createDropdownCategory({
    dropdown_code,
    label_mr,
    label_en,
    section_name,
    input_type: input_type || 'select',
    hospital_id: hospitalId,
    sort_order: sort_order || 0,
    is_active: true,
  });
};

const createDropdownOptionRecord = async (payload, hospitalId) => {
  const { dropdown_id, value_code, label_mr, label_en, sort_order } = payload;

  if (!dropdown_id || !value_code || !label_mr) {
    throw new AppError('dropdown_id, value_code, and label_mr are required', {
      statusCode: 400,
      code: 'DROPDOWN_OPTION_VALIDATION',
    });
  }

  return createDropdownOption({
    dropdown_id,
    value_code,
    label_mr,
    label_en,
    hospital_id: hospitalId,
    sort_order: sort_order || 0,
    is_active: true,
  });
};

const getDropdownsList = async (hospitalId, language = LANGUAGES.ENGLISH) => {
  const dropdowns = await listAllDropdowns(hospitalId);
  
  const categories = dropdowns.map((dropdown) => ({
    dropdown_id: dropdown.dropdown_id,
    dropdown_code: dropdown.dropdown_code,
    label: language === LANGUAGES.MARATHI ? dropdown.label_mr : dropdown.label_en,
    section_name: dropdown.section_name,
    input_type: dropdown.input_type,
    sort_order: dropdown.sort_order,
  }));
  
  return { categories };
};

const getDropdownOptions = async (dropdownCode, hospitalId, language = LANGUAGES.ENGLISH) => {
  const dropdown = await getDropdownByCode(dropdownCode, hospitalId);
  
  if (!dropdown) {
    throw new AppError('Dropdown category not found', {
      statusCode: 404,
      code: 'DROPDOWN_NOT_FOUND',
    });
  }

  const options = await getOptionsByDropdownId(dropdown.dropdown_id, hospitalId);

  return {
    dropdown_code: dropdown.dropdown_code,
    label: language === LANGUAGES.MARATHI ? dropdown.label_mr : dropdown.label_en,
    options: options.map((opt) => ({
      value_code: opt.value_code,
      label: language === LANGUAGES.MARATHI ? opt.label_mr : opt.label_en,
    })),
  };
};

const getAllDropdownsWithOptions = async (hospitalId, language = LANGUAGES.ENGLISH) => {
  const dropdowns = await listAllDropdowns(hospitalId);
  
  const dropdownsWithOptions = await Promise.all(
    dropdowns.map(async (dropdown) => {
      const options = await getOptionsByDropdownId(dropdown.dropdown_id, hospitalId);
      
      return {
        dropdown_id: dropdown.dropdown_id,
        dropdown_code: dropdown.dropdown_code,
        label: language === LANGUAGES.MARATHI ? dropdown.label_mr : dropdown.label_en,
        section_name: dropdown.section_name,
        input_type: dropdown.input_type,
        sort_order: dropdown.sort_order,
        options: options.map((opt) => ({
          value_code: opt.value_code,
          label: language === LANGUAGES.MARATHI ? opt.label_mr : opt.label_en,
          sort_order: opt.sort_order,
        })),
      };
    })
  );
  
  return { dropdowns: dropdownsWithOptions };
};

module.exports = {
  createDropdownCategoryRecord,
  createDropdownOptionRecord,
  getDropdownsList,
  getDropdownOptions,
  getAllDropdownsWithOptions,
};
