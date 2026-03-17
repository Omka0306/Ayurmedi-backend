/**
 * parse.util.js
 * Shared helpers for Lambda event parsing and pagination
 */

/**
 * Parse JSON body from API Gateway event.
 */
const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new Error('Invalid JSON body');
  }
};

/**
 * Extract a path parameter (string) from API Gateway event.
 */
const parsePathParam = (event, key) => {
  const val = event.pathParameters && event.pathParameters[key];
  return val || null;
};

/**
 * Extract query string parameters safely.
 */
const parseQuery = (event) => event.queryStringParameters || {};

/**
 * Parse pagination params from query string.
 * Returns { limit, lastKey }
 */
const parsePagination = (event) => {
  const qs = parseQuery(event);
  const limit = Math.min(parseInt(qs.limit || '50', 10), 200);
  let lastKey;
  if (qs.lastKey) {
    try {
      lastKey = JSON.parse(Buffer.from(qs.lastKey, 'base64').toString('utf8'));
    } catch {
      lastKey = undefined;
    }
  }
  return { limit, lastKey };
};

/**
 * Encode a DynamoDB LastEvaluatedKey to a safe cursor string.
 */
const encodeCursor = (lastEvaluatedKey) => {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
};

/**
 * Validate that required fields exist in an object.
 * Throws if any are missing.
 */
const requireFields = (obj, fields) => {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length > 0) {
    const { AppError } = require('./error.util');
    throw new AppError(`Missing required fields: ${missing.join(', ')}`, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }
};

module.exports = {
  parseBody,
  parsePathParam,
  parseQuery,
  parsePagination,
  encodeCursor,
  requireFields,
};
