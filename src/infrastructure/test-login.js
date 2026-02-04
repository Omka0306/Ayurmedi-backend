/* Test script to diagnose login issues */

require('dotenv').config();

const { login, getUserByEmail } = require('../services/cognito.service');
const { getUserByCognitoId } = require('../persistence/user.repo');
const logger = require('../utils/logger.util');

const run = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  logger.info('Testing login flow', { email });

  // Step 1: Check if user exists in Cognito
  try {
    const cognitoUser = await getUserByEmail(email);
    logger.info('Cognito user found', { 
      username: cognitoUser.username, 
      sub: cognitoUser.sub 
    });

    // Step 2: Check if user exists in DynamoDB
    const dbUser = await getUserByCognitoId(cognitoUser.sub);
    if (dbUser) {
      logger.info('DynamoDB user found', { 
        user_id: dbUser.user_id,
        cognito_user_id: dbUser.cognito_user_id,
        email: dbUser.email,
        role: dbUser.role,
        status: dbUser.status
      });
    } else {
      logger.error('User NOT found in DynamoDB', { 
        cognito_user_id: cognitoUser.sub 
      });
    }

    // Step 3: Attempt login
    logger.info('Attempting login...');
    const tokens = await login({ email, password });
    logger.info('Login successful!', { 
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn
    });

  } catch (err) {
    logger.error('Test failed', { 
      error: err.message, 
      code: err.code,
      stack: err.stack 
    });
    throw err;
  }
};

run()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed', err);
    process.exit(1);
  });
