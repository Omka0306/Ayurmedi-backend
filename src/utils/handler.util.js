/**
 * Shared handler factory — reduces boilerplate across all handlers.
 * Every Lambda handler follows the same pattern:
 *   1. Verify JWT
 *   2. (Optional) Role guard
 *   3. Parse body / params
 *   4. Call workflow
 *   5. Return response
 */
const { verifyJwtToken } = require("../middlewares/auth.middleware");
const { roleGuard } = require("../middlewares/role.middleware");
const { ok, created, badRequest, serverError } = require("./response.util");
const { toHttpResponse, isAppError } = require("./error.util");
const {
  parseBody,
  parsePathParam,
  parseQuery,
  parsePagination,
} = require("./parse.util");
const { validateBody } = require("./validators");
const logger = require("./logger.util");

const handleError = (err) => {
  logger.error("Handler error", { error: err.message, stack: err.stack });
  if (isAppError(err)) return toHttpResponse(err);
  return serverError("Internal Server Error", err.message);
};

/**
 * Create a protected Lambda handler.
 * @param {string[]} allowedRoles  — empty array = all authenticated users allowed
 * @param {Function} fn            — async (event, authContext) => data
 * @param {boolean}  use201        — use 201 Created instead of 200 OK
 */
const makeHandler =
  (allowedRoles, fn, use201 = false) =>
  async (event) => {
    try {
      const authHeader =
        event.headers?.Authorization || event.headers?.authorization;
      const authContext = await verifyJwtToken(authHeader);
      if (allowedRoles && allowedRoles.length > 0) {
        roleGuard(authContext, allowedRoles);
      }
      const data = await fn(event, authContext);
      return use201 ? created(data) : ok(data);
    } catch (err) {
      return handleError(err);
    }
  };

/**
 * Create a public (no-auth) Lambda handler.
 */
const makePublicHandler = (fn) => async (event) => {
  try {
    const data = await fn(event);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
};

module.exports = {
  makeHandler,
  makePublicHandler,
  parseBody,
  parsePathParam,
  parseQuery,
  parsePagination,
  handleError,
};
