const medicineService = require('../services/medicine.service');

const createMedicine = async (payload, context) => {
  return medicineService.createMedicineRecord(payload, context.hospital_id);
};

const listMedicines = async (queryParams, context) => {
  return medicineService.getMedicinesList(context.hospital_id, queryParams);
};

const searchMedicines = async (queryParams, context) => {
  return medicineService.searchMedicinesByName(context.hospital_id, queryParams.q);
};

const updateMedicineStatus = async (medicineId, payload, context) => {
  return medicineService.toggleMedicineStatus(medicineId, payload.is_active);
};

const getMedicinesGroupedByType = async (context) => {
  return medicineService.getMedicinesGroupedByType(context.hospital_id);
};

module.exports = {
  createMedicine,
  listMedicines,
  searchMedicines,
  updateMedicineStatus,
  getMedicinesGroupedByType,
};
