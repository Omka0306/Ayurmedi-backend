const { makeHandler, parseBody, parsePathParam } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/panchakarma.workflow');

const CLINICAL = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT];

module.exports.createPlan = makeHandler(CLINICAL, async (event, ctx) => {
  return workflow.createPlan(parseBody(event), ctx);
}, true);

module.exports.getPlan = makeHandler(CLINICAL, async (event, ctx) => {
  return workflow.getPlan(parsePathParam(event, 'id'), ctx);
});

module.exports.listByPatient = makeHandler(CLINICAL, async (event, ctx) => {
  return workflow.listByPatient(parsePathParam(event, 'patientId'), ctx);
});

module.exports.addSession = makeHandler(CLINICAL, async (event, ctx) => {
  const planId = parsePathParam(event, 'id');
  return workflow.addSession(planId, parseBody(event), ctx);
}, true);

module.exports.listSessions = makeHandler(CLINICAL, async (event, ctx) => {
  return workflow.getSessions(parsePathParam(event, 'id'), ctx);
});

module.exports.updateSession = makeHandler(CLINICAL, async (event, ctx) => {
  const sessionId = parsePathParam(event, 'sessionId');
  const body = parseBody(event);
  if (body.plan_id) {
    return workflow.updateSession(body.plan_id, sessionId, body, ctx);
  }
  // Fallback: resolve plan_id by session_id (Scan on sessions table)
  return workflow.updateSessionById(sessionId, body, ctx);
});
