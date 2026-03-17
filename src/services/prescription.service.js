const {
  createPrescription, getPrescriptionById,
  listPrescriptionsByPatient, listPrescriptionsByConsultation,
} = require('../persistence/prescription.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { adjustStock, addStockMovement } = require('../persistence/inventory.repo');
const { STOCK_MOVEMENT } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const createNewPrescription = async (payload, authContext) => {
  const { patient_id, medicines } = payload;
  if (!patient_id) throw new AppError('patient_id is required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const patient = await getPatientById(patient_id);
  if (!patient) throw new AppError('Patient not found', { statusCode: 404, code: 'PATIENT_NOT_FOUND' });
  if (patient.hospital_id !== authContext.hospital_id) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });

  const prescription = await createPrescription({
    ...payload,
    hospital_id: authContext.hospital_id,
    doctor_id:   authContext.user.user_id,
    doctor_name: authContext.user.full_name,
  });

  // Auto-deduct inventory for each medicine that has an item_id
  if (Array.isArray(medicines)) {
    const deductions = medicines.filter((m) => m.item_id && m.qty_to_dispense);
    await Promise.allSettled(
      deductions.map(async (m) => {
        await adjustStock(m.item_id, -m.qty_to_dispense, authContext.hospital_id);
        await addStockMovement({
          item_id:        m.item_id,
          hospital_id:    authContext.hospital_id,
          movement_type:  STOCK_MOVEMENT.DISPENSED,
          quantity:       m.qty_to_dispense,
          reference_id:   prescription.prescription_id,
          reference_type: 'PRESCRIPTION',
          notes:          `Dispensed to patient ${patient_id}`,
          created_by:     authContext.user.user_id,
        });
      })
    );
  }

  return prescription;
};

const getPrescription = async (prescriptionId, hospitalId) => {
  const p = await getPrescriptionById(prescriptionId);
  if (!p) throw new AppError('Prescription not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (p.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return p;
};

const listByPatient = async (patientId, hospitalId, pagination) => {
  const patient = await getPatientById(patientId);
  if (!patient || patient.hospital_id !== hospitalId) throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });
  return listPrescriptionsByPatient(patientId, pagination);
};

module.exports = { createNewPrescription, getPrescription, listByPatient };
