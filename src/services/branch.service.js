const { createBranch, getBranchById, listBranchesByHospital, updateBranch } = require('../persistence/branch.repo');
const { AppError } = require('../utils/error.util');

const addBranch = async (hospitalId, payload) => {
  const { name, address, phone, email, is_main } = payload;
  if (!name) throw new AppError('Branch name is required', { statusCode: 400, code: 'VALIDATION_ERROR' });
  return createBranch({ hospital_id: hospitalId, name, address, phone, email, is_main: !!is_main });
};

const getBranch = async (branchId, hospitalId) => {
  const branch = await getBranchById(branchId);
  if (!branch) throw new AppError('Branch not found', { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (hospitalId && branch.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return branch;
};

const listBranches = async (hospitalId) => listBranchesByHospital(hospitalId);

const modifyBranch = async (branchId, updates, hospitalId) => {
  const existing = await getBranchById(branchId);
  if (!existing) throw new AppError('Branch not found', { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (existing.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  const allowed = ['name', 'address', 'phone', 'email', 'status'];
  const safeUpdates = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });
  return updateBranch(branchId, safeUpdates);
};

module.exports = { addBranch, getBranch, listBranches, modifyBranch };
