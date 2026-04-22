import Joi from 'joi';
import { schemas } from "../../common/validators.js";
const { indianMobile } = schemas;

export const patientParamsSchema = Joi.object({
  hospitalId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().optional(),
  patientId: Joi.string().uuid().optional(),
  historyId: Joi.string().uuid().optional()
});

export const createPatientSchema = Joi.object({
  patientName: Joi.string().required(),
  assignedDoctorId: Joi.string().uuid().required(),
  mobileNumber: indianMobile.required(),
  formData: Joi.object({
    formTemplateId: Joi.string().uuid().required(),
    formVersion: Joi.number().integer().required(),
    responses: Joi.object().pattern(Joi.string().uuid(), Joi.any()).required()
  }).required()
}).options({ stripUnknown: true });

export const updatePatientSchema = Joi.object({
  patientName: Joi.string().optional(),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "DISCHARGED").optional(),
  mobileNumber: indianMobile.optional(),
  assignedDoctorId: Joi.string().uuid().optional(),
  formData: Joi.object({
    formTemplateId: Joi.string().uuid().optional(),
    formVersion: Joi.number().integer().optional(),
    responses: Joi.object().pattern(Joi.string().uuid(), Joi.any()).optional()
  }).optional()
}).options({ stripUnknown: true });

export const searchPatientSchema = Joi.object({
  q: Joi.string().min(2).required()
}).options({ stripUnknown: true });

export const createHistorySchema = Joi.object({
  formData: Joi.object({
    formTemplateId: Joi.string().uuid().required(),
    formVersion: Joi.number().integer().required(),
    responses: Joi.object().pattern(Joi.string().uuid(), Joi.any()).required()
  }).required()
}).options({ stripUnknown: true });
