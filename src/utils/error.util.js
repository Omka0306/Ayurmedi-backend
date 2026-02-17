class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = options.name || 'AppError';
    this.statusCode = options.statusCode || 500;
    this.code = options.code;
    this.details = options.details;
  }
}

const isAppError = (err) => err instanceof AppError;

const toHttpResponse = (err) => {
  const statusCode = err.statusCode || 500;
  const body = {
    success: false,
    message: err.message || 'Internal Server Error',
  };
  if (err.code) body.code = err.code;
  if (err.details) body.details = err.details;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
};

module.exports = {
  AppError,
  isAppError,
  toHttpResponse,
};

