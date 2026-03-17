const { makeHandler, parsePathParam, parseQuery } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/report.workflow');

const ADMIN = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];
const CLINICAL = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR];

module.exports.dailyOpd = makeHandler(CLINICAL, async (event, ctx) => {
  const { date } = parseQuery(event);
  return workflow.dailyOpd(ctx, date);
});

module.exports.revenue = makeHandler(ADMIN, async (event, ctx) => {
  const { from, to } = parseQuery(event);
  const today = new Date().toISOString().split('T')[0];
  return workflow.revenue(ctx, from || today, to || today);
});

module.exports.inventoryUsage = makeHandler(ADMIN, async (event, ctx) => {
  const { from, to } = parseQuery(event);
  const today = new Date().toISOString().split('T')[0];
  return workflow.inventoryUsage(ctx, from || today, to || today);
});

module.exports.lowStock = makeHandler(ADMIN, async (event, ctx) => {
  return workflow.lowStock(ctx);
});

module.exports.patientHistory = makeHandler(CLINICAL, async (event, ctx) => {
  const patientId = parsePathParam(event, 'patientId');
  return workflow.patientHistory(patientId, ctx);
});
