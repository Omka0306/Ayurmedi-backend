/**
 * Validation schemas and utilities for API requests
 * Uses jsonschema for validation as specified in .windsurfrules
 */

const { validate } = require('jsonschema');
const { AppError } = require('../error.util');

/**
 * Validate request body against a schema
 * @param {Object} body - Request body to validate
 * @param {Object} schema - JSON schema to validate against
 * @throws {AppError} - If validation fails
 */
const validateBody = (body, schema) => {
  const result = validate(body, schema);
  
  if (!result.valid) {
    const errors = result.errors.map(err => ({
      field: err.property,
      message: err.message,
      value: err.instance
    }));
    
    throw new AppError('Validation failed', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      errors
    });
  }
  
  return true;
};

module.exports = {
  validateBody
};
