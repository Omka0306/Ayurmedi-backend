const { makeHandler, parseQuery } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/dashboard.workflow');

const ALL_STAFF = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT, ROLES.RECEPTION];
const ADMIN = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];

module.exports.summary = makeHandler(ALL_STAFF, async (event, ctx) => {
  return workflow.summary(ctx);
});

module.exports.analytics = makeHandler(ADMIN, async (event, ctx) => {
  const { days } = parseQuery(event);
  return workflow.analytics(ctx, days ? parseInt(days, 10) : 30);
});
