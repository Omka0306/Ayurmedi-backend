/**
 * Authentication request validation schemas
 */

const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 100
    },
    password: {
      type: 'string',
      minLength: 6,
      maxLength: 100
    }
  },
  additionalProperties: false
};

const forgotPasswordSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 100
    }
  },
  additionalProperties: false
};

const resetPasswordSchema = {
  type: 'object',
  required: ['email', 'confirmationCode', 'newPassword'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 100
    },
    confirmationCode: {
      type: 'string',
      minLength: 1,
      maxLength: 20
    },
    newPassword: {
      type: 'string',
      minLength: 6,
      maxLength: 100
    }
  },
  additionalProperties: false
};

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
