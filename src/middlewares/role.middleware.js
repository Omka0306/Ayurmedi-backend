const { AppError } = require('../utils/error.util');

const roleGuard = (authContext, requiredRoles = []) => {
  if (!authContext) {
    throw new AppError('Unauthorized', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  if (!requiredRoles.length) {
    return;
  }

  if (!requiredRoles.includes(authContext.role)) {
    throw new AppError('Forbidden', {
      statusCode: 403,
      code: 'FORBIDDEN_ROLE',
    });
  }
};

module.exports = {
  roleGuard,
};

