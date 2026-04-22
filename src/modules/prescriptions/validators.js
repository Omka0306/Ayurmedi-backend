import Joi from 'joi';

export const prescriptParamsSchema = Joi.object({
  consultId: Joi.string().uuid().required(),
  rxId: Joi.string().uuid().optional()
});

const medicineSchema = Joi.object({
  inventoryItemId: Joi.string().uuid().allow(null).optional(),
  medicineName: Joi.string().required(),
  dosageForm: Joi.string().valid("CHURNA", "TABLET", "KADHA", "OIL", "GHEE", "CAPSULE", "SYRUP").required(),
  dosageQty: Joi.number().required(),
  frequency: Joi.string().valid("ONCE_DAILY", "TWICE_DAILY", "THRICE_DAILY", "AS_NEEDED").required(),
  timing: Joi.string().valid("BEFORE_MEALS", "AFTER_MEALS", "WITH_MEALS", "BEDTIME", "EMPTY_STOMACH").required(),
  durationDays: Joi.number().integer().required(),
  specialInstructions: Joi.string().optional()
}).options({ stripUnknown: true });

const treatmentSchema = Joi.object({
  treatmentType: Joi.string().valid("ABHYANGA", "SWEDANA", "BASTI", "NASYA", "JALAUKAVACHARAN", "LEPA", "PARISHEK", "KATI_BASTI", "SHIRO_BASTI").required(),
  notes: Joi.string().optional(),
  linkedPanchakarmaId: Joi.string().uuid().optional()
}).options({ stripUnknown: true });

export const createPrescriptionSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  doctorId: Joi.string().uuid().required(),
  hospitalId: Joi.string().uuid().required(),
  medicines: Joi.array().items(medicineSchema).optional(),
  treatments: Joi.array().items(treatmentSchema).optional(),
  dietInstructions: Joi.object({
    pathya: Joi.array().items(Joi.string()).optional(),
    apathya: Joi.array().items(Joi.string()).optional()
  }).optional(),
  lifestyleInstructions: Joi.object({
    exercise: Joi.string().optional(),
    yoga: Joi.string().optional(),
    rest: Joi.string().optional(),
    prohibitedActivities: Joi.string().optional()
  }).optional(),
  precautions: Joi.string().optional(),
  followUpDate: Joi.string().isoDate().optional(),
  treatmentDurationDays: Joi.number().integer().optional()
}).options({ stripUnknown: true });

export const updatePrescriptionSchema = Joi.object({
  medicines: Joi.array().items(medicineSchema).optional(),
  treatments: Joi.array().items(treatmentSchema).optional(),
  dietInstructions: Joi.object({
    pathya: Joi.array().items(Joi.string()).optional(),
    apathya: Joi.array().items(Joi.string()).optional()
  }).optional(),
  lifestyleInstructions: Joi.object({
    exercise: Joi.string().optional(),
    yoga: Joi.string().optional(),
    rest: Joi.string().optional(),
    prohibitedActivities: Joi.string().optional()
  }).optional(),
  precautions: Joi.string().optional(),
  followUpDate: Joi.string().isoDate().optional(),
  treatmentDurationDays: Joi.number().integer().optional()
}).options({ stripUnknown: true });
