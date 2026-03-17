const { makeHandler, parseBody, parsePathParam, parseQuery, parsePagination } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const workflow = require('../workflows/inventory.workflow');

const ADMIN = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];
const ALL_CLINICAL = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT];

module.exports.createItem = makeHandler(ADMIN, async (event, ctx) => {
  return workflow.createItem(parseBody(event), ctx);
}, true);

module.exports.listItems = makeHandler(ALL_CLINICAL, async (event, ctx) => {
  const pag = parsePagination(event);
  const res = await workflow.listItems(ctx, pag);
  return res && Array.isArray(res.items) ? res.items : res;
});

module.exports.getItem = makeHandler(ALL_CLINICAL, async (event, ctx) => {
  return workflow.getItem(parsePathParam(event, 'id'), ctx);
});

module.exports.updateItem = makeHandler(ADMIN, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  return workflow.updateItem(id, parseBody(event), ctx);
});

module.exports.stockIn = makeHandler(ADMIN, async (event, ctx) => {
  const body = parseBody(event);
  // Backward/compat field names (used by local test scripts)
  const normalized = {
    ...body,
    quantity: body.quantity ?? body.quantity_added,
    batch_no: body.batch_no ?? body.batch_number,
  };
  return workflow.stockIn(normalized, ctx);
});

module.exports.stockAdjust = makeHandler(ADMIN, async (event, ctx) => {
  const body = parseBody(event);
  const normalized = {
    ...body,
    delta: body.delta ?? body.quantity_adjusted,
  };
  return workflow.stockAdjust(normalized, ctx);
});

module.exports.lowStockAlerts = makeHandler(ADMIN, async (event, ctx) => {
  return workflow.lowStockAlerts(ctx);
});

module.exports.expiryAlerts = makeHandler(ADMIN, async (event, ctx) => {
  const { days } = parseQuery(event);
  return workflow.expiryAlerts(ctx, days ? parseInt(days, 10) : 90);
});
