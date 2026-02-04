const { toHttpResponse, isAppError } = require('../utils/error.util');
const logger = require('../utils/logger.util');
const authHandler = require('./auth.handler');
const hospitalHandler = require('./hospital.handler');
const userHandler = require('./user.handler');

// Simple router primarily for local testing or if you prefer a single Lambda entry.
// In serverless.yml we will map routes directly to per-domain handlers, but keep this
// router available for flexibility.

module.exports.handler = async (event, context) => {
  logger.info('Incoming request', {
    path: event.rawPath || event.path,
    method: event.requestContext?.http?.method || event.httpMethod,
  });

  const routeKey =
    (event.requestContext && event.requestContext.http
      ? `${event.requestContext.http.method} ${event.rawPath}`
      : `${event.httpMethod} ${event.path}`);

  try {
    switch (routeKey) {
      case 'POST /auth/login':
        return authHandler.login(event, context);
      case 'POST /auth/logout':
        return authHandler.logout(event, context);
      case 'POST /auth/forgot-password':
        return authHandler.forgotPassword(event, context);
      case 'POST /auth/reset-password':
        return authHandler.resetPassword(event, context);
      case 'POST /hospital/register':
        return hospitalHandler.register(event, context);
      case 'POST /user/create':
        return userHandler.create(event, context);
      default:
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'Route not found' }),
        };
    }
  } catch (err) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    if (isAppError(err)) {
      return toHttpResponse(err);
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Internal Server Error',
      }),
    };
  }
};

