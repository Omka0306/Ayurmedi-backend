const STAGE = process.env.STAGE || process.env.NODE_ENV || 'dev';

module.exports = {
  STAGE,
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',

  USER_POOL_ID: process.env.USER_POOL_ID,
  USER_POOL_CLIENT_ID: process.env.USER_POOL_CLIENT_ID,

  TABLES: {
    HOSPITALS: process.env.HOSPITALS_TABLE || `ayurmedi-backend-hospitals-${STAGE}`,
    USERS: process.env.USERS_TABLE || `ayurmedi-backend-users-${STAGE}`,
  },

  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
    DOCTOR: 'DOCTOR',
    RECEPTION: 'RECEPTION',
    ASSISTANT: 'ASSISTANT',
  },
};

