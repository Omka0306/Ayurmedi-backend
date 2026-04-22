import Joi from 'joi';

export const pathParamsSchema = Joi.object({
  patientId: Joi.string().uuid().optional(),
  pkId: Joi.string().uuid().optional(),
  sessionId: Joi.string().uuid().optional()
});

export const createPkSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  doctorId: Joi.string().uuid().required(),
  hospitalId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  procedureType: Joi.string().valid("VAMANA", "VIRECHANA", "BASTI", "NASYA", "RAKTAMOKSHANA", "OTHER").required(),
  totalSessions: Joi.number().integer().min(1).required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().optional(),
  preProcedure: Joi.object({
    snehapanaOil: Joi.string().allow("").optional(),
    snehapanaQty: Joi.string().allow("").optional(),
    abhyangaDays: Joi.number().integer().optional(),
    swedanaDays: Joi.number().integer().optional()
  }).optional(),
  materialsRequired: Joi.array().items(
    Joi.object({
      inventoryItemId: Joi.string().uuid().allow(null).optional(),
      itemName: Joi.string().required(),
      quantity: Joi.number().required(),
      unit: Joi.string().optional()
    })
  ).optional(),
  billingMode: Joi.string().valid("PER_SESSION", "FULL_COURSE").required()
}).options({ stripUnknown: true });

export const updatePkSchema = Joi.object({
  status: Joi.string().valid("PLANNED", "IN_PROGRESS", "CANCELLED").optional(),
  endDate: Joi.string().isoDate().optional(),
  preProcedure: Joi.object({
    snehapanaOil: Joi.string().allow("").optional(),
    snehapanaQty: Joi.string().allow("").optional(),
    abhyangaDays: Joi.number().integer().optional(),
    swedanaDays: Joi.number().integer().optional()
  }).optional(),
  materialsRequired: Joi.array().items(
    Joi.object({
      inventoryItemId: Joi.string().uuid().allow(null).optional(),
      itemName: Joi.string().required(),
      quantity: Joi.number().required(),
      unit: Joi.string().optional()
    })
  ).optional()
}).options({ stripUnknown: true });

export const createSessionSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  sessionNumber: Joi.number().integer().required(),
  date: Joi.string().isoDate().required(),
  startTime: Joi.string().optional(),
  endTime: Joi.string().optional(),
  therapistId: Joi.string().uuid().required(),
  vitalsBefore: Joi.object({
    bp: Joi.string().optional(),
    pulse: Joi.number().optional()
  }).optional(),
  vitalsAfter: Joi.object({
    bp: Joi.string().optional(),
    pulse: Joi.number().optional()
  }).optional(),
  materialsUsed: Joi.array().items(
    Joi.object({
      inventoryItemId: Joi.string().uuid().required(),
      itemName: Joi.string().optional(),
      quantity: Joi.number().required(),
      unit: Joi.string().optional()
    })
  ).optional(),
  observations: Joi.string().allow("").optional(),
  doctorNotes: Joi.string().allow("").optional(),
  status: Joi.string().valid("COMPLETED", "SKIPPED").required()
}).options({ stripUnknown: true });

export const updateSessionSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  vitalsAfter: Joi.object({
    bp: Joi.string().optional(),
    pulse: Joi.number().optional()
  }).optional(),
  observations: Joi.string().allow("").optional(),
  doctorNotes: Joi.string().allow("").optional()
}).options({ stripUnknown: true });
