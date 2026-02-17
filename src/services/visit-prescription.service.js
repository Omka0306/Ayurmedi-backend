const { AppError } = require('../utils/error.util');
const {
  createVisitPrescription,
  getPrescriptionByVisitId,
  getPrescriptionById,
  addPrescriptionItem,
  getItemsByPrescription,
  removePrescriptionItem,
} = require('../persistence/visit-prescription.repo');
const { getVisitById, updateVisitStatus, updateVisitStage } = require('../persistence/visit.repo');

/**
 * Create prescription for a visit
 * ONE prescription per visit
 */
const createPrescriptionForVisit = async (visitId, payload, doctorId) => {
  const { notes, follow_up_date } = payload;

  // Verify visit exists
  const visit = await getVisitById(visitId);
  if (!visit) {
    throw new AppError('Visit not found', {
      statusCode: 404,
      code: 'VISIT_NOT_FOUND',
    });
  }

  // Only allow prescription for OPEN visits
  if (visit.status !== 'OPEN') {
    throw new AppError('Cannot create prescription for closed visit', {
      statusCode: 400,
      code: 'VISIT_CLOSED',
    });
  }

  // Check if prescription already exists
  const existing = await getPrescriptionByVisitId(visitId);
  if (existing) {
    throw new AppError('Prescription already exists for this visit', {
      statusCode: 400,
      code: 'PRESCRIPTION_EXISTS',
    });
  }

  // Create prescription
  const prescription = await createVisitPrescription({
    visit_id: visitId,
    doctor_id: doctorId,
    notes: notes || '',
    follow_up_date: follow_up_date || null,
  });

  // Update visit stage to READY_FOR_BILLING
  await updateVisitStage(visitId, 'READY_FOR_BILLING');

  return { prescription };
};

/**
 * Get prescription for a visit
 */
const getVisitPrescriptionWithItems = async (visitId) => {
  const prescription = await getPrescriptionByVisitId(visitId);
  
  if (!prescription) {
    return { prescription: null, items: [] };
  }

  const items = await getItemsByPrescription(prescription.prescription_id);
  
  return { prescription, items };
};

/**
 * Add medicine to prescription
 */
const addMedicineToPrescription = async (prescriptionId, payload) => {
  const {
    medicine_id,
    dose,
    timing,
    duration_days,
    quantity,
    instructions,
  } = payload;

  // Validate required fields
  if (!medicine_id || !dose) {
    throw new AppError('medicine_id and dose are required', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  // Verify prescription exists
  const prescription = await getPrescriptionById(prescriptionId);
  if (!prescription) {
    throw new AppError('Prescription not found', {
      statusCode: 404,
      code: 'PRESCRIPTION_NOT_FOUND',
    });
  }

  // Verify visit is still OPEN
  const visit = await getVisitById(prescription.visit_id);
  if (visit.status !== 'OPEN') {
    throw new AppError('Cannot edit prescription for closed visit', {
      statusCode: 400,
      code: 'VISIT_CLOSED',
    });
  }

  // Add item
  const item = await addPrescriptionItem({
    prescription_id: prescriptionId,
    medicine_id,
    dose,
    timing: timing || null,
    duration_days: duration_days || null,
    quantity: quantity || null,
    instructions: instructions || null,
  });

  return { item };
};

/**
 * Remove medicine from prescription
 */
const removeMedicineFromPrescription = async (itemId) => {
  await removePrescriptionItem(itemId);
  return { message: 'Item removed successfully' };
};

/**
 * Get complete visit summary (patient + visit + history + prescription + items)
 */
const getCompleteVisitSummary = async (visitId, hospitalId) => {
  const visit = await getVisitById(visitId);
  if (!visit) {
    throw new AppError('Visit not found', {
      statusCode: 404,
      code: 'VISIT_NOT_FOUND',
    });
  }

  if (visit.hospital_id !== hospitalId) {
    throw new AppError('Access denied', {
      statusCode: 403,
      code: 'ACCESS_DENIED',
    });
  }

  // Get patient
  const { getPatientById } = require('../persistence/patient.repo');
  const patient = await getPatientById(visit.patient_id);

  // Get history
  const { getHistoryByVisit } = require('../persistence/patient-history.repo');
  const history = await getHistoryByVisit(visitId);

  // Get prescription + items
  const prescription = await getPrescriptionByVisitId(visitId);
  let items = [];
  if (prescription) {
    items = await getItemsByPrescription(prescription.prescription_id);
  }

  return {
    visit,
    patient,
    history,
    prescription,
    items,
  };
};

module.exports = {
  createPrescriptionForVisit,
  getVisitPrescriptionWithItems,
  addMedicineToPrescription,
  removeMedicineFromPrescription,
  getCompleteVisitSummary,
};
