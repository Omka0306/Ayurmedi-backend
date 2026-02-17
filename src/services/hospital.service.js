const { v4: uuidv4 } = require('uuid');
const { ROLES } = require('../constants/config');
const { createHospital, getAllHospitals, getHospitalById, getHospitalByCode, updateHospital, deleteHospital } = require('../persistence/hospital.repo');
const { createUser } = require('../persistence/user.repo');
const { adminCreateUserWithPassword } = require('./cognito.service');
const { AppError } = require('../utils/error.util');

const registerHospitalWithAdmin = async (payload) => {
  const {
    hospital_code,
    name,
    email,
    contact_number,
    address,
    city,
    state,
    country,
    pincode,
    registration_no,
    type,
    owner_name,
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

  // Check if hospital with same code already exists
  const existingHospital = await getHospitalByCode(hospital_code);
  if (existingHospital) {
    throw new AppError(`Hospital with code '${hospital_code}' already exists`, {
      statusCode: 409,
      code: 'HOSPITAL_CODE_DUPLICATE',
      details: {
        existing_hospital_id: existingHospital.hospital_id,
        existing_hospital_name: existingHospital.name,
      },
    });
  }

  const hospitalId = uuidv4();

  const hospital = await createHospital({
    hospital_id: hospitalId,
    hospital_code,
    name,
    email,
    contact_number,
    address,
    city,
    state,
    country,
    pincode,
    registration_no,
    type,
    owner_name,
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

/**
 * Get all hospitals with pagination
 */
const listAllHospitals = async (options = {}) => {
  const result = await getAllHospitals(options);
  return result;
};

/**
 * Update hospital by ID
 */
const updateHospitalById = async (hospitalId, updates) => {
  // Check if hospital exists
  const existingHospital = await getHospitalById(hospitalId);
  if (!existingHospital) {
    throw new AppError('Hospital not found', {
      statusCode: 404,
      code: 'HOSPITAL_NOT_FOUND',
    });
  }

  // Validate updates
  if (updates.hospital_code) {
    delete updates.hospital_code; // Don't allow changing hospital code
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', {
      statusCode: 400,
      code: 'NO_VALID_FIELDS',
    });
  }

  const updatedHospital = await updateHospital(hospitalId, updates);
  return updatedHospital;
};

/**
 * Delete hospital by ID (soft delete)
 */
const deleteHospitalById = async (hospitalId) => {
  // Check if hospital exists
  const existingHospital = await getHospitalById(hospitalId);
  if (!existingHospital) {
    throw new AppError('Hospital not found', {
      statusCode: 404,
      code: 'HOSPITAL_NOT_FOUND',
    });
  }

  const deletedHospital = await deleteHospital(hospitalId);
  return deletedHospital;
};

/**
 * Get hospital by ID
 */
const getHospital = async (hospitalId) => {
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) {
    throw new AppError('Hospital not found', {
      statusCode: 404,
      code: 'HOSPITAL_NOT_FOUND',
    });
  }
  return hospital;
};

module.exports = {
  registerHospitalWithAdmin,
  listAllHospitals,
  updateHospitalById,
  deleteHospitalById,
  getHospital,
};

