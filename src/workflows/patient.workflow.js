const patientService = require('../services/patient.service');

/**
 * Register a new patient
 */
const registerPatient = async (payload, context) => {
  return patientService.registerPatient(
    payload,
    context.hospital_id,
    context.branch_id
  );
};

/**
 * Search patients
 */
const searchPatients = async (query, context) => {
  return patientService.searchPatientsByQuery(context.hospital_id, query);
};

/**
 * List patients with pagination
 */
const listPatients = async (options, context) => {
  return patientService.getPatientsList(context.hospital_id, options);
};

/**
 * Get patient by ID  
 */
const getPatientById = async (patientId, context) => {
  return patientService.getPatient(patientId, context.hospital_id);
};

module.exports = {
  registerPatient,
  searchPatients,
  listPatients,
  getPatientById,
};
