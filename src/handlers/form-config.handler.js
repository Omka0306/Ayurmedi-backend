const { makeHandler, parseBody, parsePathParam } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/form-config.workflow');

const ADMIN_ONLY = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];
const ALL_STAFF  = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT, ROLES.RECEPTION];

module.exports.get = makeHandler(ALL_STAFF, async (event, ctx) => {
  const formType = parsePathParam(event, 'formType');
  return workflow.get(ctx.hospital_id, formType);
});

module.exports.save = makeHandler(ADMIN_ONLY, async (event, ctx) => {
  const formType = parsePathParam(event, 'formType');
  const body = parseBody(event);
  return workflow.save(ctx.hospital_id, formType, body);
});

module.exports.list = makeHandler(ALL_STAFF, async (event, ctx) => {
  return workflow.list(ctx.hospital_id);
});
