const { makeHandler, makePublicHandler, parseBody, parsePathParam, parseQuery } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/token.workflow');

const ALL_STAFF = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT, ROLES.RECEPTION];

module.exports.create = makeHandler(ALL_STAFF, async (event, ctx) => {
  return workflow.create(parseBody(event), ctx);
}, true);

module.exports.getQueue = makeHandler(ALL_STAFF, async (event, ctx) => {
  const { doctor_id, date } = parseQuery(event);
  return workflow.getQueue(ctx, doctor_id, date);
});

module.exports.updateStatus = makeHandler(ALL_STAFF, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  const { status } = parseBody(event);
  return workflow.updateStatus(id, status, ctx);
});

// Public display endpoint — no auth required (TV/waiting area screen)
module.exports.display = makePublicHandler(async (event) => {
  const { hospital_id, doctor_id } = parseQuery(event);
  if (!hospital_id) return { error: 'hospital_id is required' };
  return workflow.display({ hospital_id }, doctor_id);
});
