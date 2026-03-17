const { makeHandler, parseBody, parsePathParam, parsePagination } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/billing.workflow');

const ALL_STAFF = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT, ROLES.RECEPTION];
const ADMIN_STAFF = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.RECEPTION];

module.exports.create = makeHandler(ALL_STAFF, async (event, ctx) => {
  return workflow.create(parseBody(event), ctx);
}, true);

module.exports.get = makeHandler(ALL_STAFF, async (event, ctx) => {
  return workflow.get(parsePathParam(event, 'id'), ctx);
});

module.exports.recordPayment = makeHandler(ADMIN_STAFF, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  const body = parseBody(event);
  const normalized = {
    ...body,
    mode: body.mode ?? body.payment_mode,
    reference_no: body.reference_no ?? body.transaction_id,
  };
  return workflow.recordPayment(id, normalized, ctx);
});

module.exports.listByPatient = makeHandler(ALL_STAFF, async (event, ctx) => {
  const patientId = parsePathParam(event, 'patientId');
  const pag = parsePagination(event);
  const res = await workflow.listByPatient(patientId, ctx, pag);
  return res && Array.isArray(res.items) ? res.items : res;
});
