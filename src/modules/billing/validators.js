import Joi from 'joi';

const lineItemSchema = Joi.object({
  type: Joi.string().valid("CONSULTATION", "MEDICINE", "PANCHAKARMA", "THERAPY").required(),
  inventoryItemId: Joi.string().uuid().allow(null).optional(),
  pkId: Joi.string().uuid().allow(null).optional(),
  description: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unitPrice: Joi.number().min(0).required()
}).options({ stripUnknown: true });

export const createBillSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  hospitalId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  consultId: Joi.string().uuid().allow(null).optional(),
  lineItems: Joi.array().items(lineItemSchema).min(1).required(),
  discountType: Joi.string().valid("PERCENTAGE", "FIXED").allow(null).optional(),
  discountValue: Joi.number().min(0).optional(),
  taxRate: Joi.number().min(0).max(100).optional().default(0)
}).options({ stripUnknown: true });

export const updateBillSchema = Joi.object({
  lineItems: Joi.array().items(lineItemSchema).min(1).optional(),
  discountType: Joi.string().valid("PERCENTAGE", "FIXED").allow(null).optional(),
  discountValue: Joi.number().min(0).optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid("ISSUED", "CANCELLED").optional()
}).options({ stripUnknown: true });

export const addPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  mode: Joi.string().valid("CASH", "UPI", "CARD", "BANK_TRANSFER", "INSURANCE").required(),
  reference: Joi.string().allow("").optional(),
  paidAt: Joi.string().isoDate().optional()
}).options({ stripUnknown: true });

export const pathParamsSchema = Joi.object({
  patientId: Joi.string().uuid().optional(),
  billId: Joi.string().uuid().optional(),
  hospitalId: Joi.string().uuid().optional()
});

export const summaryQuerySchema = Joi.object({
  from: Joi.string().isoDate().required(),
  to: Joi.string().isoDate().required()
}).options({ stripUnknown: true });
