import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

export const updateHospitalSchema = Joi.object({
  name: Joi.string().optional(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required()
  }).optional(),
  gstin: Joi.string().optional(),
  contactPhone: baseSchemas.indianMobile.optional(),
  contactEmail: baseSchemas.email.optional(),
  consultationFee: Joi.number().min(0).optional(),
  settings: Joi.object({
    timezone: Joi.string().required(),
    currency: Joi.string().required(),
    language: Joi.string().required()
  }).optional()
}).options({ stripUnknown: true });

export const hospitalIdParamSchema = Joi.object({
  hospitalId: baseSchemas.uuid
});
