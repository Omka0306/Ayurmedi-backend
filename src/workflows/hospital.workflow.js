const { registerHospitalWithAdmin, getHospital, listAllHospitals } = require('../services/hospital.service');

const registerHospital = async (payload /*, context */) => {
  // context is available if we need SUPER_ADMIN info later
  return registerHospitalWithAdmin(payload);
};

module.exports = {
  registerHospital,
  getHospital: (id) => getHospital(id),
  listHospitals: () => listAllHospitals(),
};

