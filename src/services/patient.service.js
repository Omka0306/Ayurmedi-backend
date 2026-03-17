const { v4: uuidv4 } = require('uuid');
const {
  createPatient, getPatientById, listPatientsByHospital, searchPatients, updatePatient,
} = require('../persistence/patient.repo');
const { AppError } = require('../utils/error.util');

const registerPatient = async (payload, authContext) => {
  const { name, mobile, hospital_id } = payload;
  if (!name || !mobile) {
    throw new AppError('name and mobile are required', { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const hid = hospital_id || authContext.hospital_id;
  const reg_no = `PAT-${Date.now().toString(36).toUpperCase()}`;

  return createPatient({ ...payload, hospital_id: hid, registration_no: reg_no });
};

const getPatient = async (patientId, hospitalId) => {
  const patient = await getPatientById(patientId);
  if (!patient) throw new AppError('Patient not found', { statusCode: 404, code: 'PATIENT_NOT_FOUND' });
  if (patient.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return patient;
};

const listPatients = async (hospitalId, pagination) => {
  return listPatientsByHospital(hospitalId, pagination);
};

const findPatients = async (hospitalId, searchTerm) => {
  if (!searchTerm || searchTerm.length < 2) {
    throw new AppError('Search term must be at least 2 characters', { statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  return searchPatients(hospitalId, searchTerm);
};

const modifyPatient = async (patientId, updates, hospitalId) => {
  const existing = await getPatientById(patientId);
  if (!existing) throw new AppError('Patient not found', { statusCode: 404, code: 'PATIENT_NOT_FOUND' });
  if (existing.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });

  // Disallow changing core identity fields directly
  const disallowed = ['patient_id', 'hospital_id', 'registered_at', 'created_at', 'registration_no'];
  disallowed.forEach((k) => delete updates[k]);

  return updatePatient(patientId, updates);
};

module.exports = { registerPatient, getPatient, listPatients, findPatients, modifyPatient };
