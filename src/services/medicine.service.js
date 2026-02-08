const { AppError } = require('../utils/error.util');
const {
  createMedicine,
  getMedicineById,
  listMedicinesByType,
  searchMedicines,
  updateMedicineStatus,
} = require('../persistence/medicine.repo');

const createMedicineRecord = async (payload, hospitalId) => {
  const { name_mr, name_en, medicine_type, price } = payload;

  if (!name_mr || !medicine_type) {
    throw new AppError('name_mr and medicine_type are required', {
      statusCode: 400,
      code: 'MEDICINE_VALIDATION',
    });
  }

  const medicine = await createMedicine({
    hospital_id: hospitalId,
    name_mr,
    name_en,
    medicine_type,
    price: price || 0,
    is_active: true,
  });
  
  return { medicine };
};

const getMedicinesList = async (hospitalId, filters = {}) => {
  if (filters.type) {
    const medicines = await listMedicinesByType(hospitalId, filters.type);
    return { medicines };
  }
  
  // List all medicines by scanning (hospital-specific + global)
  const medicines = await require('../persistence/medicine.repo').listAllMedicines(hospitalId);
  return { medicines };
};

const searchMedicinesByName = async (hospitalId, searchQuery) => {
  if (!searchQuery || searchQuery.trim().length === 0) {
    throw new AppError('Search query is required', {
      statusCode: 400,
      code: 'SEARCH_QUERY_REQUIRED',
    });
  }

  const medicines = await searchMedicines(hospitalId, searchQuery.trim());
  return { medicines };
};

const toggleMedicineStatus = async (medicineId, isActive) => {
  const medicine = await getMedicineById(medicineId);
  if (!medicine) {
    throw new AppError('Medicine not found', {
      statusCode: 404,
      code: 'MEDICINE_NOT_FOUND',
    });
  }

  return updateMedicineStatus(medicineId, isActive);
};

const getMedicinesGroupedByType = async (hospitalId) => {
  const { listAllMedicines } = require('../persistence/medicine.repo');
  const allMedicines = await listAllMedicines(hospitalId);
  
  // Group medicines by type
  const medicinesByType = {};
  allMedicines.forEach((medicine) => {
    const type = medicine.medicine_type;
    if (!medicinesByType[type]) {
      medicinesByType[type] = [];
    }
    medicinesByType[type].push(medicine);
  });
  
  return { medicines_by_type: medicinesByType };
};

module.exports = {
  createMedicineRecord,
  getMedicinesList,
  searchMedicinesByName,
  toggleMedicineStatus,
  getMedicinesGroupedByType,
};
