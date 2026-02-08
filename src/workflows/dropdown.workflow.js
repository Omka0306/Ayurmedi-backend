const dropdownService = require('../services/dropdown.service');

const listDropdowns = async (queryParams, context) => {
  const language = queryParams.lang || 'en';
  return dropdownService.getDropdownsList(context.hospital_id, language);
};

const getDropdownOptions = async (dropdownCode, queryParams, context) => {
  const language = queryParams.lang || 'en';
  return dropdownService.getDropdownOptions(dropdownCode, context.hospital_id, language);
};

const getAllDropdownsWithOptions = async (queryParams, context) => {
  const language = queryParams.lang || 'en';
  return dropdownService.getAllDropdownsWithOptions(context.hospital_id, language);
};

const createDropdownCategory = async (payload, context) => {
  return dropdownService.createDropdownCategoryRecord(payload, context.hospital_id);
};

const createDropdownOption = async (payload, context) => {
  return dropdownService.createDropdownOptionRecord(payload, context.hospital_id);
};

module.exports = {
  listDropdowns,
  getDropdownOptions,
  getAllDropdownsWithOptions,
  createDropdownCategory,
  createDropdownOption,
};
