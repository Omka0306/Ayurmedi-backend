const branchService = require('../services/branch.service');
module.exports = {
  create: (hospitalId, body)         => branchService.addBranch(hospitalId, body),
  list:   (hospitalId)               => branchService.listBranches(hospitalId),
  update: (branchId, body, ctx)      => branchService.modifyBranch(branchId, body, ctx.hospital_id),
};
