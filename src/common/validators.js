import Joi from "joi";
import { ValidationError } from "./errors.js";

export const schemas = {
  hospitalId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  patientId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  doctorId: Joi.string().uuid().required(),
  uuid: Joi.string().uuid().required(),
  indianMobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),
  email: Joi.string().email().required(),
  dateString: Joi.string().isoDate().required(),
};

/**
 * Validates and parses the request body.
 * Applies { stripUnknown: true } to silently drop any unrecognised fields
 * before they reach business logic.
 */
export const validateBody = (schema) => (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body || "{}")
        : event.body || {};
    const { error, value } = schema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join(", ");
      throw new ValidationError(messages);
    }
    return value;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Invalid JSON body");
  }
};

export const validatePathParams = (schema) => (event) => {
  const params = event.pathParameters || {};
  const { error, value } = schema.validate(params, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const messages = error.details.map((d) => d.message).join(", ");
    throw new ValidationError(messages);
  }
  return value;
};

export const validateQueryParams = (schema) => (event) => {
  const params = event.queryStringParameters || {};
  const { error, value } = schema.validate(params, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const messages = error.details.map((d) => d.message).join(", ");
    throw new ValidationError(messages);
  }
  return value;
};
