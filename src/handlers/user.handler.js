const { makeHandler, parseBody, parsePathParam, parseQuery } = require('../utils/handler.util');
const { ROLES } = require('../constants/config');
const userService = require('../services/user.service');

const ADMIN = [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN];

module.exports.create = makeHandler(ADMIN, async (event, ctx) => {
  return userService.createStaffUser(parseBody(event), ctx);
}, true);

module.exports.list = makeHandler(ADMIN, async (event, ctx) => {
  const { role } = parseQuery(event);
  return userService.listStaffUsers(ctx.hospital_id, role);
});

module.exports.get = makeHandler(ADMIN, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  return userService.getUser(id, ctx.hospital_id);
});

module.exports.update = makeHandler(ADMIN, async (event, ctx) => {
  const id   = parsePathParam(event, 'id');
  const body = parseBody(event);
  return userService.updateStaffUser(id, body, ctx.hospital_id);
});

module.exports.remove = makeHandler(ADMIN, async (event, ctx) => {
  const id = parsePathParam(event, 'id');
  return userService.removeUser(id, ctx.hospital_id);
});
