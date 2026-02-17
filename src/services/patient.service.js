const { AppError } = require('../utils/error.util');
const {
  createPatient,
  getPatientById,
  checkMobileExists,
  searchPatients,
  listPatients,
} = require('../persistence/patient.repo');

/**
 * Register a new patient
 */
const registerPatient = async (payload, hospitalId, branchId) => {
  const { full_name, mobile, gender, dob, address } = payload;

  // Validate required fields
  if (!full_name || !mobile) {
    throw new AppError('full_name and mobile are required', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  // Check if mobile already exists for this hospital
  const existing = await checkMobileExists(hospitalId, mobile);
  if (existing) {
    throw new AppError('Mobile number already registered', {
      statusCode: 400,
      code: 'DUPLICATE_MOBILE',
    });
  }

  // Create patient
  const patient = await createPatient({
    hospital_id: hospitalId,
    branch_id: branchId,
    full_name,
    mobile,
    gender: gender || null,
    dob: dob || null,
    address: address || null,
  });

  return { patient };
};

/**
 * Get patient by ID
 */
const getPatient = async (patientId, hospitalId) => {
  const patient = await getPatientById(patientId);

  if (!patient) {
    throw new AppError('Patient not found', {
      statusCode: 404,
      code: 'PATIENT_NOT_FOUND',
    });
  }

  // Verify hospital isolation
  if (patient.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  return { patient };
};

/**
 * Search patients by mobile or name
 */
const searchPatientsByQuery = async (hospitalId, query) => {
  if (!query || query.trim().length === 0) {
    throw new AppError('Search query is required', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const patients = await searchPatients(hospitalId, query.trim());
  return { patients };
};

/**
 * List patients with pagination
 */
const getPatientsList = async (hospitalId, options) => {
  const result = await listPatients(hospitalId, options);
  return {
    patients: result.items,
    pagination: {
      hasMore: result.hasMore,
      lastKey: result.lastKey,
    },
  };
};

module.exports = {
  registerPatient,
  getPatient,
  searchPatientsByQuery,
  getPatientsList,
};
