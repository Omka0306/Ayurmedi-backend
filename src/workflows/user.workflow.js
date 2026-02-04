const { createHospitalUser } = require('../services/user.service');

const createUser = async (payload, context) => {
  return createHospitalUser(payload, context);
};

module.exports = {
  createUser,
};

