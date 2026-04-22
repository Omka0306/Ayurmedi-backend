import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

export const createUserSchema = Joi.object({
  email: baseSchemas.email,
  password: Joi.string().min(8).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phone: baseSchemas.indianMobile,
  role: Joi.string().valid('HOSPITAL_ADMIN', 'DOCTOR', 'ASSISTANT_DOCTOR', 'RECEPTIONIST').required(),
  branchId: Joi.string().uuid().optional()
}).options({ stripUnknown: true });

export const updateUserSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().optional(),
  role: Joi.string().valid('HOSPITAL_ADMIN', 'DOCTOR', 'ASSISTANT_DOCTOR', 'RECEPTIONIST').optional(),
  branchId: Joi.string().uuid().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional()
}).options({ stripUnknown: true });

export const userIdParamSchema = Joi.object({
  userId: baseSchemas.uuid
});

export const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  lastKey: Joi.string().optional()
}).options({ stripUnknown: true });
