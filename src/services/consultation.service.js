const {
  createConsultation, getConsultationById,
  listConsultationsByPatient, listConsultationsByHospitalAndDate, updateConsultation,
} = require('../persistence/consultation.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { AppError } = require('../utils/error.util');

const createNewConsultation = async (payload, authContext) => {
  const { patient_id } = payload;
  if (!patient_id) throw new AppError('patient_id is required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const patient = await getPatientById(patient_id);
  if (!patient) throw new AppError('Patient not found', { statusCode: 404, code: 'PATIENT_NOT_FOUND' });
  if (patient.hospital_id !== authContext.hospital_id) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });

  return createConsultation({
    ...payload,
    hospital_id: authContext.hospital_id,
    branch_id:   authContext.branch_id || payload.branch_id || null,
    doctor_id:   authContext.user.user_id,
    doctor_name: authContext.user.full_name,
  });
};

const getConsultation = async (consultationId, hospitalId) => {
  const c = await getConsultationById(consultationId);
  if (!c) throw new AppError('Consultation not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (c.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return c;
};

const listByPatient = async (patientId, hospitalId, pagination) => {
  const patient = await getPatientById(patientId);
  if (!patient || patient.hospital_id !== hospitalId) throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });
  return listConsultationsByPatient(patientId, pagination);
};

const listByHospitalDate = async (hospitalId, date) => {
  return listConsultationsByHospitalAndDate(hospitalId, date || new Date().toISOString().split('T')[0]);
};

const editConsultation = async (consultationId, updates, hospitalId) => {
  const existing = await getConsultationById(consultationId);
  if (!existing) throw new AppError('Consultation not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (existing.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  const disallowed = ['consultation_id', 'patient_id', 'hospital_id', 'created_at'];
  disallowed.forEach((k) => delete updates[k]);
  return updateConsultation(consultationId, updates);
};

module.exports = { createNewConsultation, getConsultation, listByPatient, listByHospitalDate, editConsultation };
