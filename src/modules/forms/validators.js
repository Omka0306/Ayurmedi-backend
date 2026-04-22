import Joi from "joi";
import { schemas as baseSchemas } from "../../common/validators.js";

const fieldSchema = Joi.object({
  fieldId: baseSchemas.uuid,
  name: Joi.string().required(),
  label: Joi.string().required(),
  labelMr: Joi.string().required(),
  type: Joi.string().valid('TEXT', 'NUMBER', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'DROPDOWN', 'CHECKBOX', 'RADIO', 'MULTI_SELECT', 'TEXTAREA', 'BODY_MAP').required(),
  required: Joi.boolean().default(false),
  order: Joi.number().integer().required(),
  placeholder: Joi.string().optional().allow('', null),
  defaultValue: Joi.any().optional().allow('', null),
  options: Joi.array().items(Joi.object({
    value: Joi.string().required(),
    label: Joi.string().required(),
    labelMr: Joi.string().required()
  })).optional(),
  validation: Joi.object({
    minLength: Joi.number().integer().optional(),
    maxLength: Joi.number().integer().optional(),
    pattern: Joi.string().optional(),
    min: Joi.number().optional(),
    max: Joi.number().optional()
  }).optional().allow(null),
  showIf: Joi.object({
    fieldId: baseSchemas.uuid.required(),
    operator: Joi.string().valid('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GT', 'LT').required(),
    value: Joi.any().required()
  }).optional().allow(null)
}).options({ stripUnknown: true });

const sectionSchema = Joi.object({
  sectionId: baseSchemas.uuid,
  title: Joi.string().required(),
  titleMr: Joi.string().required(),
  order: Joi.number().integer().required(),
  fields: Joi.array().items(fieldSchema).required()
}).options({ stripUnknown: true });

export const createFormSchema = Joi.object({
  formType: Joi.string().valid('PATIENT_REGISTRATION', 'PATIENT_HISTORY', 'CONSULTATION', 'PANCHAKARMA').required(),
  name: Joi.string().required(),
  nameMr: Joi.string().required(),
  sections: Joi.array().items(sectionSchema).required()
}).options({ stripUnknown: true });

export const updateFormSchema = Joi.object({
  name: Joi.string().optional(),
  nameMr: Joi.string().optional(),
  sections: Joi.array().items(sectionSchema).optional()
}).options({ stripUnknown: true });

export const publishFormSchema = Joi.object({}).options({ stripUnknown: true });

export const formParamsSchema = Joi.object({
  hospitalId: baseSchemas.uuid,
  formId: baseSchemas.uuid.optional()
});
