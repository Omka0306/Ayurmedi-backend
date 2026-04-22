import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

export const createDoctorSchema = Joi.object({
  userId: baseSchemas.uuid,
  branchIds: Joi.array().items(baseSchemas.uuid).min(1).required(),
  name: Joi.string().required(),
  specialization: Joi.string().required(),
  registrationNumber: Joi.string().required(),
  averageConsultationMinutes: Joi.number().integer().min(5).default(15)
}).options({ stripUnknown: true });

export const updateDoctorSchema = Joi.object({
  branchIds: Joi.array().items(baseSchemas.uuid).min(1).optional(),
  name: Joi.string().optional(),
  specialization: Joi.string().optional(),
  registrationNumber: Joi.string().optional(),
  availabilityStatus: Joi.string().valid('AVAILABLE', 'BUSY', 'OFF').optional(),
  averageConsultationMinutes: Joi.number().integer().min(5).optional(),
  digitalSignatureS3Key: Joi.string().optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional()
}).options({ stripUnknown: true });

export const doctorParamsSchema = Joi.object({
  hospitalId: baseSchemas.uuid,
  doctorId: baseSchemas.uuid.optional()
});
