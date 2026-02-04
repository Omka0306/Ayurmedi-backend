const { ok, noContent, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const authWorkflow = require('../workflows/auth.workflow');
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

module.exports.login = async (event) => {
  try {
    const body = parseBody(event);
    if (!body.email || !body.password) {
      return badRequest('Email and password are required');
    }
    const tokens = await authWorkflow.login(body);
    return ok(tokens);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.logout = async () => {
  try {
    await authWorkflow.logout({});
    return noContent();
  } catch (err) {
    return handleError(err);
  }
};

module.exports.forgotPassword = async (event) => {
  try {
    const body = parseBody(event);
    if (!body.email) {
      return badRequest('Email is required');
    }
    const res = await authWorkflow.forgotPassword(body);
    return ok(res);
  } catch (err) {
    return handleError(err);
  }
};

module.exports.resetPassword = async (event) => {
  try {
    const body = parseBody(event);
    if (!body.email || !body.confirmationCode || !body.newPassword) {
      return badRequest('email, confirmationCode, and newPassword are required');
    }
    const res = await authWorkflow.resetPassword(body);
    return ok(res);
  } catch (err) {
    return handleError(err);
  }
};

