import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

export const registerHospitalSchema = Joi.object({
  hospitalName: Joi.string().required(),
  adminEmail: baseSchemas.email,
  password: Joi.string().min(8).required(),
  phone: baseSchemas.indianMobile,
  hospitalType: Joi.string().valid('AYURVEDIC', 'ALLOPATHIC', 'MULTI').required()
});

export const loginSchema = Joi.object({
  email: baseSchemas.email,
  password: Joi.string().required()
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  email: baseSchemas.email
});

export const resetPasswordSchema = Joi.object({
  email: baseSchemas.email,
  confirmationCode: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

export const changePasswordSchema = Joi.object({
  accessToken: Joi.string().required(),
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});
