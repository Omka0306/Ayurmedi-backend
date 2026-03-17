const {
  makeHandler,
  makePublicHandler,
  parseBody,
} = require("../utils/handler.util");
const { validateBody } = require("../utils/validators");
const authWorkflow = require("../workflows/auth.workflow");
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../utils/validators/auth.validators");

/**
 * Authenticate user with email and password
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context (not used for login)
 * @returns {Object} Authentication tokens
 */
module.exports.login = makePublicHandler(async (event) => {
  const body = parseBody(event);
  validateBody(body, loginSchema);
  const tokens = await authWorkflow.login(body);
  return tokens;
});

/**
 * Logout user (invalidate tokens)
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context
 * @returns {Object} Empty response
 */
module.exports.logout = makeHandler([], async (event, ctx) => {
  await authWorkflow.logout({});
  return {};
});

/**
 * Request password reset code
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context (not used for forgot password)
 * @returns {Object} Confirmation message
 */
module.exports.forgotPassword = makePublicHandler(async (event) => {
  const body = parseBody(event);
  validateBody(body, forgotPasswordSchema);
  const res = await authWorkflow.forgotPassword(body);
  return res;
});

/**
 * Reset password with confirmation code
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context (not used for reset password)
 * @returns {Object} Confirmation message
 */
module.exports.resetPassword = makePublicHandler(async (event) => {
  const body = parseBody(event);
  validateBody(body, resetPasswordSchema);
  const res = await authWorkflow.resetPassword(body);
  return res;
});
