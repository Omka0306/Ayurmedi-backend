const tokenService = require('../services/token.service');
module.exports = {
  create:      (body, ctx)           => tokenService.generateToken(body, ctx),
  getQueue:    (ctx, doctorId, date) => tokenService.getQueue(ctx.hospital_id, doctorId, date),
  updateStatus:(id, status, ctx)     => tokenService.changeTokenStatus(id, status, ctx.hospital_id),
  display:     (ctx, doctorId)       => tokenService.getDisplayData(ctx.hospital_id, doctorId),
};
