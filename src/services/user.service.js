const { ROLES } = require('../constants/config');
const { createUser } = require('../persistence/user.repo');
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
    cognito_user_id: cognitoUser.sub || cognitoUser.username,
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

module.exports = {
  createHospitalUser,
};

