const {
  createToken, getTokenById, listQueueByHospitalAndDate,
  updateTokenStatus, getNextTokenNumber,
} = require('../persistence/token.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { getUserById } = require('../persistence/user.repo');
const { TOKEN_STATUS, ROLES } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const generateToken = async (payload, authContext) => {
  const { patient_id, doctor_id } = payload;
  if (!patient_id || !doctor_id) {
    throw new AppError('patient_id and doctor_id are required', { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const hospitalId = authContext.hospital_id;
  const today = new Date().toISOString().split('T')[0];

  const [patient, doctor] = await Promise.all([
    getPatientById(patient_id),
    getUserById(doctor_id),
  ]);

  if (!patient || patient.hospital_id !== hospitalId)
    throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (!doctor || doctor.hospital_id !== hospitalId)
    throw new AppError('Doctor not found', { statusCode: 404, code: 'NOT_FOUND' });

  const tokenNumber = await getNextTokenNumber(hospitalId, doctor_id, today);

  return createToken({
    hospital_id:  hospitalId,
    branch_id:    authContext.branch_id || null,
    doctor_id,
    doctor_name:  doctor.full_name,
    patient_id,
    patient_name: patient.name,
    token_number: tokenNumber,
  });
};

const getQueue = async (hospitalId, doctorId, date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const tokens = await listQueueByHospitalAndDate(hospitalId, targetDate, doctorId);

  // Attach estimated wait time
  const waiting = tokens.filter((t) => t.status === TOKEN_STATUS.WAITING);
  const inConsult = tokens.find((t) => t.status === TOKEN_STATUS.IN_CONSULT);

  // Build augmented list
  let waitPosition = 0;
  return tokens.map((t) => {
    const augmented = { ...t };
    if (t.status === TOKEN_STATUS.WAITING) {
      waitPosition += 1;
      augmented.wait_position = waitPosition;
    }
    return augmented;
  });
};

const changeTokenStatus = async (tokenId, status, hospitalId) => {
  if (!Object.values(TOKEN_STATUS).includes(status)) {
    throw new AppError(`Invalid status. Valid: ${Object.values(TOKEN_STATUS).join(', ')}`, {
      statusCode: 400, code: 'INVALID_STATUS',
    });
  }
  const token = await getTokenById(tokenId);
  if (!token) throw new AppError('Token not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (token.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return updateTokenStatus(tokenId, status);
};

const getDisplayData = async (hospitalId, doctorId) => {
  const today = new Date().toISOString().split('T')[0];
  const tokens = await listQueueByHospitalAndDate(hospitalId, today, doctorId);
  const current = tokens.find((t) => t.status === TOKEN_STATUS.IN_CONSULT);
  const waiting = tokens.filter((t) => t.status === TOKEN_STATUS.WAITING);
  const completed = tokens.filter((t) => t.status === TOKEN_STATUS.COMPLETED);
  return {
    current_token: current || null,
    next_token:    waiting[0] || null,
    waiting_count: waiting.length,
    completed_count: completed.length,
    date:          today,
  };
};

module.exports = { generateToken, getQueue, changeTokenStatus, getDisplayData };
