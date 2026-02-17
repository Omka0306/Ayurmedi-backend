const { ROLES } = require('../constants/config');
const {
  createUser,
  getAllUsers,
  getUsersByHospital,
  getUserById,
  updateUser,
  deleteUser,
} = require('../persistence/user.repo');
const { adminCreateUserWithPassword } = require('./cognito.service');
const { AppError } = require('../utils/error.util');

const allowedRoles = [
  ROLES.DOCTOR,
  ROLES.ASSISTANT,
  ROLES.RECEPTION,
];

const createHospitalUser = async (payload, context) => {
  const { hospital_id, branch_id } = context;

  const { full_name, email, mobile, role, password } = payload;

  if (!email || !role || !password) {
    throw new AppError('Missing required fields for user creation', {
      statusCode: 400,
      code: 'USER_CREATE_VALIDATION',
    });
  }

  if (!allowedRoles.includes(role)) {
    throw new AppError('Invalid role for hospital user', {
      statusCode: 400,
      code: 'USER_ROLE_INVALID',
    });
  }

  const cognitoUser = await adminCreateUserWithPassword({
    email,
    tempPassword: password,
    permanentPassword: password,
    name: full_name || email,
    role,
    hospital_id,
    branch_id: branch_id || 'MAIN',
  });

  const user = await createUser({
    user_id: undefined, // Let repo generate UUID
    cognito_user_id: cognitoUser.User?.Username || cognitoUser.Username, 
    hospital_id,
    branch_id: branch_id || 'MAIN',
    full_name: full_name || email,
    mobile,
    email,
    role,
    status: 'ACTIVE',
  });

  return user;
};

const listAllUsers = async (options = {}) => {
  return getAllUsers(options);
};

const listHospitalUsers = async (hospitalId, options = {}) => {
  return getUsersByHospital(hospitalId, options);
};

const getUser = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('User not found', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  }
  return user;
};

const updateUserById = async (userId, updates) => {
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    throw new AppError('User not found', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  }

  const updatedUser = await updateUser(userId, updates);
  return updatedUser;
};

const deleteUserById = async (userId) => {
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    throw new AppError('User not found', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  }

  const deletedUser = await deleteUser(userId);
  return deletedUser;
};

module.exports = {
  createHospitalUser,
  listAllUsers,
  listHospitalUsers,
  getUser,
  updateUserById,
  deleteUserById,
};

