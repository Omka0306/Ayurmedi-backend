const consultationService = require('../services/consultation.service');
module.exports = {
  create:       (body, ctx)           => consultationService.createNewConsultation(body, ctx),
  get:          (id, ctx)             => consultationService.getConsultation(id, ctx.hospital_id),
  update:       (id, body, ctx)       => consultationService.editConsultation(id, body, ctx.hospital_id),
  listByPatient:(patientId, ctx, pag) => consultationService.listByPatient(patientId, ctx.hospital_id, pag),
  listByDate:   (ctx, date)           => consultationService.listByHospitalDate(ctx.hospital_id, date),
};
