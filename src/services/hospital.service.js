const { v4: uuidv4 } = require('uuid');
const { ROLES } = require('../constants/config');
const { createHospital, getHospitalById, listHospitals } = require('../persistence/hospital.repo');
const { createUser } = require('../persistence/user.repo');
const { adminCreateUserWithPassword } = require('./cognito.service');
const { AppError } = require('../utils/error.util');

const registerHospitalWithAdmin = async (payload) => {
  const {
    hospital_code,
    name,
    registration_no,
    type,
    owner_name,
    email,
    website,
    subscription_plan,
    subscription_start,
    subscription_end,
    admin_full_name,
    admin_email,
    admin_mobile,
    admin_password,
  } = payload;

  if (!hospital_code || !name || !admin_email || !admin_password) {
    throw new AppError('Missing required fields for hospital registration', {
      statusCode: 400,
      code: 'HOSPITAL_REGISTER_VALIDATION',
    });
  }

  const hospitalId = uuidv4();

  const hospital = await createHospital({
    hospital_id: hospitalId,
    hospital_code,
    name,
    registration_no,
    type,
    owner_name,
    email,
    website,
    subscription_plan,
    subscription_start,
    subscription_end,
    status: 'ACTIVE',
  });

  const cognitoUser = await adminCreateUserWithPassword({
    email: admin_email,
    tempPassword: admin_password,
    permanentPassword: admin_password,
    name: admin_full_name || admin_email,
    role: ROLES.HOSPITAL_ADMIN,
    hospital_id: hospital.hospital_id,
    branch_id: 'MAIN',
  });

  const user = await createUser({
    cognito_user_id: cognitoUser.sub || cognitoUser.username,
    hospital_id: hospital.hospital_id,
    branch_id: 'MAIN',
    full_name: admin_full_name || admin_email,
    mobile: admin_mobile,
    email: admin_email,
    role: ROLES.HOSPITAL_ADMIN,
    status: 'ACTIVE',
  });

  return {
    hospital,
    admin_user: user,
  };
};

const getHospital = async (hospitalId) => {
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) {
    throw new AppError('Hospital not found', { statusCode: 404, code: 'NOT_FOUND' });
  }
  return hospital;
};

const listAllHospitals = async () => {
  return listHospitals();
};

module.exports = {
  registerHospitalWithAdmin,
  getHospital,
  listAllHospitals,
};

