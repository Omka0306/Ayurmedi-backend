import Joi from 'joi';

export const consultParamsSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  consultId: Joi.string().uuid().optional()
});

export const createConsultSchema = Joi.object({
  doctorId: Joi.string().uuid().required(),
  hospitalId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  tokenId: Joi.string().required(),
  chiefComplaint: Joi.string().required()
}).options({ stripUnknown: true });

export const clinicalExaminationSchema = Joi.object({
  generalCondition: Joi.string().optional(),
  vitalSigns: Joi.object({
    bp: Joi.string().optional(),
    pulse: Joi.number().integer().optional(),
    temperature: Joi.number().optional(),
    weight: Joi.number().optional(),
    height: Joi.number().optional()
  }).optional(),
  ashtavidhaPariksha: Joi.object({
    nadi: Joi.string().optional(),
    mala: Joi.string().optional(),
    mutra: Joi.string().optional(),
    jihwa: Joi.string().optional(),
    shabda: Joi.string().optional(),
    sparsha: Joi.string().optional(),
    drik: Joi.string().optional(),
    akriti: Joi.string().optional()
  }).optional(),
  abdomenExamination: Joi.object({
    liver: Joi.string().optional(),
    spleen: Joi.string().optional(),
    navel: Joi.string().optional()
  }).optional(),
  systemicExamination: Joi.object({
    lung: Joi.string().optional(),
    heart: Joi.string().optional(),
    throat: Joi.string().optional(),
    teeth: Joi.string().optional(),
    nose: Joi.object({ left: Joi.string().optional(), right: Joi.string().optional() }).optional(),
    eyes: Joi.string().optional(),
    nails: Joi.string().optional(),
    tongue: Joi.string().optional(),
    pulse: Joi.string().optional(),
    joints: Joi.string().optional(),
    ear: Joi.string().optional(),
    back: Joi.string().optional(),
    skin: Joi.string().optional(),
    weight: Joi.string().optional()
  }).optional(),
  bodyMapMarkings: Joi.array().items(
    Joi.object({
      area: Joi.string().required(),
      view: Joi.string().valid("FRONT", "BACK", "SIDE", "INTERNAL").required(),
      coordinates: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required()
      }).required(),
      notes: Joi.string().optional()
    })
  ).optional(),
  ayurvedicDiagnosis: Joi.object({
    dosha: Joi.object({
      vata: Joi.boolean().optional(),
      pitta: Joi.boolean().optional(),
      kapha: Joi.boolean().optional()
    }).optional(),
    avastha: Joi.string().optional(),
    treatmentPrinciple: Joi.string().optional()
  }).optional()
}).options({ stripUnknown: true });

export const updateConsultSchema = Joi.object({
  chiefComplaint: Joi.string().optional(),
  clinicalExamination: clinicalExaminationSchema.optional()
}).options({ stripUnknown: true });
