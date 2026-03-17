const prescriptionService = require('../services/prescription.service');
module.exports = {
  create:       (body, ctx)           => prescriptionService.createNewPrescription(body, ctx),
  get:          (id, ctx)             => prescriptionService.getPrescription(id, ctx.hospital_id),
  listByPatient:(patientId, ctx, pag) => prescriptionService.listByPatient(patientId, ctx.hospital_id, pag),
};
