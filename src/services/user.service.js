const { v4: uuidv4 } = require('uuid');
const { createUser, listUsersByHospital, getUserById, updateUser, deactivateUser } = require('../persistence/user.repo');
const { adminCreateUserWithPassword } = require('./cognito.service');
const { ROLES } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const createStaffUser = async (payload, authContext) => {
  const { full_name, email, mobile, role, branch_id, password, specialization, avg_consult_mins } = payload;

  if (!full_name || !email || !role || !password) {
    throw new AppError('full_name, email, role, and password are required', { statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!Object.values(ROLES).includes(role) || role === ROLES.SUPER_ADMIN) {
    throw new AppError('Invalid role', { statusCode: 400, code: 'INVALID_ROLE' });
  }

  const hospital_id = authContext.hospital_id;
  const cognitoUser = await adminCreateUserWithPassword({
    email, tempPassword: password, permanentPassword: password,
    name: full_name, role, hospital_id, branch_id: branch_id || 'MAIN',
  });

  return createUser({
    cognito_user_id: cognitoUser.sub || cognitoUser.username,
    hospital_id,
    branch_id: branch_id || null,
    full_name, mobile, email, role,
    specialization: specialization || null,
    avg_consult_mins: avg_consult_mins || 15,
    status: 'ACTIVE',
  });
};

const listStaffUsers = async (hospitalId, filterRole) => {
  const users = await listUsersByHospital(hospitalId, { filterRole });
  // Strip sensitive fields
  return users.map(({ cognito_user_id, ...rest }) => rest);
};

const getUser = async (userId, hospitalId) => {
  const user = await getUserById(userId);
  if (!user) throw new AppError('User not found', { statusCode: 404, code: 'USER_NOT_FOUND' });
  if (user.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  const { cognito_user_id, ...rest } = user;
  return rest;
};

const updateStaffUser = async (userId, updates, hospitalId) => {
  const existing = await getUserById(userId);
  if (!existing) throw new AppError('User not found', { statusCode: 404, code: 'USER_NOT_FOUND' });
  if (existing.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });

  const allowed = ['full_name', 'mobile', 'specialization', 'avg_consult_mins', 'branch_id', 'status'];
  const safeUpdates = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });

  return updateUser(userId, safeUpdates);
};

const removeUser = async (userId, hospitalId) => {
  const existing = await getUserById(userId);
  if (!existing) throw new AppError('User not found', { statusCode: 404, code: 'USER_NOT_FOUND' });
  if (existing.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return deactivateUser(userId);
};

module.exports = { createStaffUser, listStaffUsers, getUser, updateStaffUser, removeUser };
