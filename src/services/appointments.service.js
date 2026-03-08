const { AppError } = require('../utils/error.util');
const {
  createAppointment,
  getAppointmentById,
  listAppointmentsByDate,
  listAppointmentsByPatient,
  listAppointmentsByDoctor,
  updateAppointmentStatus,
} = require('../persistence/appointments.repo');
const { getPatientById } = require('../persistence/patient.repo');

const VALID_STATUSES = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

/**
 * Book a new appointment
 */
const bookAppointment = async (payload, context) => {
  const {
    patient_id,
    doctor_id,
    appointment_date, // ISO date string e.g. "2026-03-08"
    appointment_time, // e.g. "10:30"
    reason,
    notes,
  } = payload;

  if (!patient_id || !appointment_date || !appointment_time) {
    throw new AppError('patient_id, appointment_date, and appointment_time are required', { statusCode: 400 });
  }

  // Verify patient exists
  const patient = await getPatientById(patient_id);
  if (!patient) throw new AppError('Patient not found', { statusCode: 404 });

  if (patient.hospital_id !== context.hospital_id && context.role !== 'SUPER_ADMIN') {
    throw new AppError('Patient does not belong to your hospital', { statusCode: 403 });
  }

  const appointment = await createAppointment({
    hospital_id: context.hospital_id,
    patient_id,
    doctor_id: doctor_id || null,
    appointment_date,
    appointment_time,
    reason: reason || null,
    notes: notes || null,
    booked_by: context.user_id,
  });

  return appointment;
};

/**
 * Get appointment by ID
 */
const getAppointment = async (appointmentId, context) => {
  const apt = await getAppointmentById(appointmentId);
  if (!apt) throw new AppError('Appointment not found', { statusCode: 404 });
  if (apt.hospital_id !== context.hospital_id && context.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', { statusCode: 403 });
  }
  return apt;
};

/**
 * List appointments by date for a hospital
 */
const listByDate = async (date, options, context) => {
  if (!date) throw new AppError('date is required (YYYY-MM-DD format)', { statusCode: 400 });
  return listAppointmentsByDate(context.hospital_id, date, options);
};

/**
 * List appointments by doctor for a date
 */
const listDoctorAppointments = async (doctorId, date, options, context) => {
  if (!date) throw new AppError('date is required', { statusCode: 400 });
  return listAppointmentsByDoctor(context.hospital_id, doctorId, date, options);
};

/**
 * List appointments for a patient
 */
const listPatientAppointments = async (patientId, options, context) => {
  return listAppointmentsByPatient(patientId, options);
};

/**
 * Update appointment status
 */
const updateStatus = async (appointmentId, payload, context) => {
  const apt = await getAppointmentById(appointmentId);
  if (!apt) throw new AppError('Appointment not found', { statusCode: 404 });
  if (apt.hospital_id !== context.hospital_id && context.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', { statusCode: 403 });
  }

  const { status, notes } = payload;
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${VALID_STATUSES.join(', ')}`, { statusCode: 400 });
  }

  return updateAppointmentStatus(appointmentId, status, notes || null);
};

module.exports = {
  bookAppointment,
  getAppointment,
  listByDate,
  listDoctorAppointments,
  listPatientAppointments,
  updateStatus,
};
