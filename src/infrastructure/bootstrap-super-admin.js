/* One-time script to bootstrap SUPER_ADMIN in Cognito + DynamoDB
 *
 * Required env:
 *  - AWS_REGION
 *  - USER_POOL_ID
 *  - USER_POOL_CLIENT_ID
 *  - SUPER_ADMIN_EMAIL
 *  - SUPER_ADMIN_PASSWORD
 * Optional:
 *  - SUPER_ADMIN_NAME
 */

require('dotenv').config();

const { ROLES } = require('../constants/config');
const {
  adminCreateUserWithPassword,
  getUserByEmail,
} = require('../services/cognito.service');
const { createUser } = require('../persistence/user.repo');
const logger = require('../utils/logger.util');

const run = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  logger.info('Bootstrapping SUPER_ADMIN user', { email });

  let cognitoUser;

  try {
    cognitoUser = await adminCreateUserWithPassword({
      email,
      tempPassword: password,
      permanentPassword: password,
      name,
      role: ROLES.SUPER_ADMIN,
      hospital_id: 'GLOBAL',
      branch_id: 'GLOBAL',
    });
  } catch (err) {
    if (
      err.__type === 'UsernameExistsException' ||
      err.name === 'UsernameExistsException'
    ) {
      logger.warn('SUPER_ADMIN already exists in Cognito, reusing user', {
        email,
      });
      cognitoUser = await getUserByEmail(email);
    } else {
      throw err;
    }
  }

  try {
    const user = await createUser({
      cognito_user_id: cognitoUser.sub || cognitoUser.username,
      hospital_id: 'GLOBAL',
      branch_id: 'GLOBAL',
      full_name: name,
      mobile: null,
      email,
      role: ROLES.SUPER_ADMIN,
      status: 'ACTIVE',
    });

    logger.info('SUPER_ADMIN created successfully', { user_id: user.user_id });
  } catch (err) {
    if (
      err.__type === 'com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException' ||
      err.name === 'ConditionalCheckFailedException'
    ) {
      logger.warn('SUPER_ADMIN already exists in DynamoDB, skipping create', {
        email,
      });
    } else {
      throw err;
    }
  }
};

run()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Bootstrap completed');
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Bootstrap failed', err);
    process.exit(1);
  });

