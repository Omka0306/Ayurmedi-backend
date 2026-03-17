const billingService = require('../services/billing.service');
module.exports = {
  create:       (body, ctx)              => billingService.createNewBill(body, ctx),
  get:          (id, ctx)               => billingService.getBill(id, ctx.hospital_id),
  recordPayment:(id, body, ctx)          => billingService.recordPayment(id, body, ctx.hospital_id),
  listByPatient:(patientId, ctx, pag)    => billingService.listByPatient(patientId, ctx.hospital_id, pag),
};
