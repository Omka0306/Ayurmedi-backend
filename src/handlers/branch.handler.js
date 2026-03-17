const { makeHandler, parseBody, parsePathParam } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/branch.workflow');

const ADMIN_ONLY = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];

module.exports.create = makeHandler(ADMIN_ONLY, async (event, ctx) => {
  const hospitalId = parsePathParam(event, 'hospitalId');
  const body = parseBody(event);
  return workflow.create(hospitalId, body);
}, true);

module.exports.list = makeHandler(ADMIN_ONLY, async (event, ctx) => {
  const hospitalId = parsePathParam(event, 'hospitalId');
  return workflow.list(hospitalId);
});

module.exports.update = makeHandler(ADMIN_ONLY, async (event, ctx) => {
  const id   = parsePathParam(event, 'id');
  const body = parseBody(event);
  return workflow.update(id, body, ctx);
});
