const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/config');
const userWorkflow = require('../workflows/user.workflow');
const logger = require('../utils/logger.util');

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('Invalid JSON body');
  }
};

const handleError = (err) => {
  logger.error('Handler error', { error: err.message, stack: err.stack });
  if (isAppError(err)) {
    return toHttpResponse(err);
  }
  return serverError('Internal Server Error', err.message);
};

module.exports.create = async (event) => {
  try {
    const authContext = await verifyJwtToken(
      event.headers.Authorization || event.headers.authorization,
    );
    roleGuard(authContext, [ROLES.HOSPITAL_ADMIN]);

    const body = parseBody(event);
    const user = await userWorkflow.createUser(body, authContext);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
};

