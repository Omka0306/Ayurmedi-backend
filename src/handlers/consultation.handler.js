const { makeHandler, parseBody, parsePathParam, parseQuery, parsePagination } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/consultation.workflow');

const CLINICAL = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT];

module.exports.create = makeHandler(CLINICAL, async (event, ctx) => {
  const body = parseBody(event);
  return workflow.create(body, ctx);
}, true);

module.exports.get = makeHandler(CLINICAL, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  return workflow.get(id, ctx);
});

module.exports.update = makeHandler(CLINICAL, async (event, ctx) => {
  const id   = parsePathParam(event, 'id');
  const body = parseBody(event);
  return workflow.update(id, body, ctx);
});

module.exports.listByPatient = makeHandler(CLINICAL, async (event, ctx) => {
  const patientId = parsePathParam(event, 'patientId');
  const pag = parsePagination(event);
  const res = await workflow.listByPatient(patientId, ctx, pag);
  return res && Array.isArray(res.items) ? res.items : res;
});
