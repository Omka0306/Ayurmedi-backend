const { registerHospitalWithAdmin, listAllHospitals, updateHospitalById, deleteHospitalById, getHospital: getHospitalService } = require('../services/hospital.service');

const registerHospital = async (payload /*, context */) => {
  // context is available if we need SUPER_ADMIN info later
  return registerHospitalWithAdmin(payload);
};

const listHospitals = async (options, context) => {
  // Only SUPER_ADMIN can list all hospitals
  // Role guard is handled in the handler
  return listAllHospitals(options);
};

const getHospital = async (hospitalId, context) => {
  // Only SUPER_ADMIN can get hospital details
  // Role guard is handled in the handler
  return getHospitalService(hospitalId);
};

const updateHospital = async (hospitalId, updates, context) => {
  // Only SUPER_ADMIN can update hospitals
  // Role guard is handled in the handler
  return updateHospitalById(hospitalId, updates);
};

const deleteHospital = async (hospitalId, context) => {
  // Only SUPER_ADMIN can delete hospitals
  // Role guard is handled in the handler
  return deleteHospitalById(hospitalId);
};

module.exports = {
  registerHospital,
  listHospitals,
  getHospital,
  updateHospital,
  deleteHospital,
};

