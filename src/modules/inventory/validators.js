import Joi from 'joi';

export const createItemSchema = Joi.object({
  name: Joi.string().required(),
  genericName: Joi.string().allow("").optional(),
  category: Joi.string().valid("CLASSICAL_AYURVEDIC", "PROPRIETARY", "PANCHAKARMA_OIL", "HERB", "CONSUMABLE").required(),
  unit: Joi.string().valid("TABLET", "GRAM", "ML", "BOTTLE", "PACKET", "PIECE").required(),
  purchasePrice: Joi.number().min(0).required(),
  sellingPrice: Joi.number().min(0).required(),
  currentStock: Joi.number().min(0).required(),
  reorderLevel: Joi.number().min(0).required(),
  reorderQuantity: Joi.number().min(0).optional(),
  supplierName: Joi.string().allow("").optional(),
  supplierContact: Joi.string().allow("").optional(),
  expiryDate: Joi.string().isoDate().allow(null).optional(),
  batchNumber: Joi.string().allow("").optional()
}).options({ stripUnknown: true });

export const updateItemSchema = Joi.object({
  name: Joi.string().optional(),
  genericName: Joi.string().allow("").optional(),
  category: Joi.string().valid("CLASSICAL_AYURVEDIC", "PROPRIETARY", "PANCHAKARMA_OIL", "HERB", "CONSUMABLE").optional(),
  unit: Joi.string().valid("TABLET", "GRAM", "ML", "BOTTLE", "PACKET", "PIECE").optional(),
  purchasePrice: Joi.number().min(0).optional(),
  sellingPrice: Joi.number().min(0).optional(),
  reorderLevel: Joi.number().min(0).optional(),
  reorderQuantity: Joi.number().min(0).optional(),
  supplierName: Joi.string().allow("").optional(),
  supplierContact: Joi.string().allow("").optional(),
  expiryDate: Joi.string().isoDate().allow(null).optional(),
  batchNumber: Joi.string().allow("").optional()
}).options({ stripUnknown: true });

export const stockInSchema = Joi.object({
  quantity: Joi.number().positive().required(),
  reason: Joi.string().allow("").optional(),
  batchNumber: Joi.string().allow("").optional(),
  expiryDate: Joi.string().isoDate().allow(null).optional(),
  purchasePrice: Joi.number().min(0).optional(),
  referenceId: Joi.string().allow("").optional()
}).options({ stripUnknown: true });

export const stockAdjustSchema = Joi.object({
  quantity: Joi.number().required(),
  reason: Joi.string().required()
}).options({ stripUnknown: true });

export const pathParamsSchema = Joi.object({
  hospitalId: Joi.string().uuid().optional(),
  itemId: Joi.string().uuid().optional()
});
