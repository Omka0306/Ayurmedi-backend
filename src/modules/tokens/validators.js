import Joi from 'joi';

export const createTokenSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  doctorId: Joi.string().uuid().required(),
  patientName: Joi.string().required(),
  doctorName: Joi.string().required(),
  priority: Joi.string().valid("NORMAL", "HIGH", "EMERGENCY").optional().default("NORMAL")
}).options({ stripUnknown: true });

export const priorityTokenSchema = Joi.object({
  priority: Joi.string().valid("NORMAL", "HIGH", "EMERGENCY").required()
}).options({ stripUnknown: true });

export const pathParamsSchema = Joi.object({
  hospitalId: Joi.string().uuid().optional(),
  branchId: Joi.string().uuid().optional(),
  tokenId: Joi.string().uuid().optional(),
  doctorId: Joi.string().uuid().optional()
});
