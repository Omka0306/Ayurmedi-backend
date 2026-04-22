import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

export const createBranchSchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required()
  }).required(),
  phone: baseSchemas.indianMobile,
  isMainBranch: Joi.boolean().default(false)
}).options({ stripUnknown: true });

export const updateBranchSchema = Joi.object({
  name: Joi.string().optional(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required()
  }).optional(),
  phone: baseSchemas.indianMobile.optional(),
  isMainBranch: Joi.boolean().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional()
}).options({ stripUnknown: true });

export const branchParamsSchema = Joi.object({
  hospitalId: baseSchemas.uuid,
  branchId: baseSchemas.uuid.optional()
});
