class BaseError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends BaseError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthError extends BaseError {
  constructor(message) {
    super(message, 401, "AUTH_ERROR");
  }
}

export class ForbiddenError extends BaseError {
  constructor(message) {
    super(message, 403, "FORBIDDEN_ERROR");
  }
}

export class NotFoundError extends BaseError {
  constructor(message) {
    super(message, 404, "NOT_FOUND_ERROR");
  }
}

export class ConflictError extends BaseError {
  constructor(message) {
    super(message, 409, "CONFLICT_ERROR");
  }
}

export class DatabaseError extends BaseError {
  constructor(message) {
    super(message, 500, "DATABASE_ERROR");
  }
}
