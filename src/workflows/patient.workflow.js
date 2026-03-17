const patientService = require('../services/patient.service');
module.exports = {
  create:  (body, ctx)   => patientService.registerPatient(body, ctx),
  get:     (id, ctx)     => patientService.getPatient(id, ctx.hospital_id),
  list:    (ctx, pag)    => patientService.listPatients(ctx.hospital_id, pag),
  search:  (ctx, term)   => patientService.findPatients(ctx.hospital_id, term),
  update:  (id, body, ctx) => patientService.modifyPatient(id, body, ctx.hospital_id),
};
