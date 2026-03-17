const pkService = require('../services/panchakarma.service');
module.exports = {
  createPlan:   (body, ctx)              => pkService.createTreatmentPlan(body, ctx),
  getPlan:      (planId, ctx)            => pkService.getPlan(planId, ctx.hospital_id),
  listByPatient:(patientId, ctx)         => pkService.listByPatient(patientId, ctx.hospital_id),
  addSession:   (planId, body, ctx)      => pkService.logSession(planId, body, ctx),
  getSessions:  (planId, ctx)            => pkService.getSessions(planId, ctx.hospital_id),
  updateSession:(planId, sessionId, body, ctx) => pkService.editSession(planId, sessionId, body, ctx.hospital_id),
  updateSessionById:(sessionId, body, ctx) => pkService.editSessionBySessionId(sessionId, body, ctx.hospital_id),
};
