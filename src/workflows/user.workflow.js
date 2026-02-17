const {
  createHospitalUser,
  listAllUsers,
  listHospitalUsers: listHospitalUsersService,
  getUser,
  updateUserById,
  deleteUserById,
} = require('../services/user.service');
const { ROLES } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const createUser = async (payload, context) => {
  return createHospitalUser(payload, context);
};

const listUsers = async (options, context) => {
  // SUPER_ADMIN can list all users
  if (context.role === ROLES.SUPER_ADMIN) {
    return listAllUsers(options);
  }
  
  // HOSPITAL_ADMIN can only list users in their hospital
  if (context.role === ROLES.HOSPITAL_ADMIN) {
    return listHospitalUsersService(context.hospital_id, options);
  }

  throw new AppError('Unauthorized to list users', { statusCode: 403 });
};

const listUsersByHospital = async (hospitalId, options, context) => {
  // SUPER_ADMIN can list users of any hospital
  if (context.role === ROLES.SUPER_ADMIN) {
    return listHospitalUsersService(hospitalId, options);
  }

  // HOSPITAL_ADMIN can only list users of their own hospital
  if (context.role === ROLES.HOSPITAL_ADMIN) {
    if (context.hospital_id !== hospitalId) {
      throw new AppError('Unauthorized to list users of another hospital', { statusCode: 403 });
    }
    return listHospitalUsersService(hospitalId, options);
  }

  throw new AppError('Unauthorized', { statusCode: 403 });
};

const getUserDetails = async (userId, context) => {
  const user = await getUser(userId);

  if (context.role === ROLES.SUPER_ADMIN) {
    return user;
  }

  if (context.role === ROLES.HOSPITAL_ADMIN) {
    if (user.hospital_id !== context.hospital_id) {
      throw new AppError('Unauthorized to view this user', { statusCode: 403 });
    }
    return user;
  }

  // Users can view their own profile (if we want to allow that)
  if (user.user_id === context.user_id) {
    return user;
  }

  throw new AppError('Unauthorized', { statusCode: 403 });
};

const updateUser = async (userId, updates, context) => {
  // Check if user exists and get details for permission check
  const user = await getUser(userId);

  if (context.role === ROLES.SUPER_ADMIN) {
    return updateUserById(userId, updates);
  }

  if (context.role === ROLES.HOSPITAL_ADMIN) {
    if (user.hospital_id !== context.hospital_id) {
      throw new AppError('Unauthorized to update this user', { statusCode: 403 });
    }
    // Prevent updating critical fields if needed
    return updateUserById(userId, updates);
  }

  throw new AppError('Unauthorized', { statusCode: 403 });
};

const deleteUser = async (userId, context) => {
  const user = await getUser(userId);

  if (context.role === ROLES.SUPER_ADMIN) {
    return deleteUserById(userId);
  }

  if (context.role === ROLES.HOSPITAL_ADMIN) {
    if (user.hospital_id !== context.hospital_id) {
      throw new AppError('Unauthorized to delete this user', { statusCode: 403 });
    }
    return deleteUserById(userId);
  }

  throw new AppError('Unauthorized', { statusCode: 403 });
};

module.exports = {
  createUser,
  listUsers,
  listUsersByHospital,
  getUserDetails,
  updateUser,
  deleteUser,
};

