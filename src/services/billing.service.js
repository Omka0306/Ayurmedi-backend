const { AppError } = require('../utils/error.util');
const {
  createBill,
  getBillById,
  getBillByVisitId,
  updateBillPayment,
  listBillsByHospital,
  listBillsByPatient,
} = require('../persistence/billing.repo');
const { getVisitById, updateVisitStatus } = require('../persistence/visit.repo');
const { getPatientById } = require('../persistence/patient.repo');

/**
 * Create a bill for a visit
 * - One bill per visit
 * - Visit must be OPEN or COMPLETED
 */
const createVisitBill = async (visitId, payload, context) => {
  const { hospital_id } = context;
  const {
    items = [],          // [{ description, quantity, unit_price }]
    discount_amount = 0,
    discount_notes = '',
    tax_amount = 0,
    notes = '',
  } = payload;

  // Verify visit exists
  const visit = await getVisitById(visitId);
  if (!visit) {
    throw new AppError('Visit not found', { statusCode: 404, code: 'VISIT_NOT_FOUND' });
  }

  if (visit.hospital_id !== hospital_id) {
    throw new AppError('Access denied', { statusCode: 403, code: 'ACCESS_DENIED' });
  }

  // Check no existing bill for this visit
  const existing = await getBillByVisitId(visitId);
  if (existing) {
    throw new AppError('Bill already exists for this visit', { statusCode: 409, code: 'BILL_EXISTS' });
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total_amount = subtotal + tax_amount - discount_amount;

  const bill = await createBill({
    visit_id: visitId,
    patient_id: visit.patient_id,
    hospital_id,
    items,
    subtotal,
    discount_amount,
    discount_notes,
    tax_amount,
    total_amount,
    paid_amount: 0,
    notes,
    payment_status: 'PENDING',
    payment_mode: null,
  });

  // Advance visit stage to BILLING_DONE if already READY_FOR_BILLING
  if (visit.stage === 'READY_FOR_BILLING') {
    const { updateVisitStage } = require('../persistence/visit.repo');
    await updateVisitStage(visitId, 'BILLING');
  }

  return bill;
};

/**
 * Get a bill by ID
 */
const getBill = async (billId, hospitalId) => {
  const bill = await getBillById(billId);
  if (!bill) {
    throw new AppError('Bill not found', { statusCode: 404, code: 'BILL_NOT_FOUND' });
  }
  if (bill.hospital_id !== hospitalId) {
    throw new AppError('Access denied', { statusCode: 403, code: 'ACCESS_DENIED' });
  }
  return bill;
};

/**
 * Get bill for a specific visit
 */
const getVisitBill = async (visitId, hospitalId) => {
  const visit = await getVisitById(visitId);
  if (!visit) throw new AppError('Visit not found', { statusCode: 404, code: 'VISIT_NOT_FOUND' });
  if (visit.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403 });

  const bill = await getBillByVisitId(visitId);
  return { bill: bill || null };
};

/**
 * Update payment on a bill (mark PAID / PARTIAL / CANCELLED)
 */
const payBill = async (billId, payload, hospitalId) => {
  const bill = await getBillById(billId);
  if (!bill) throw new AppError('Bill not found', { statusCode: 404, code: 'BILL_NOT_FOUND' });
  if (bill.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403 });

  if (bill.payment_status === 'PAID') {
    throw new AppError('Bill is already fully paid', { statusCode: 400, code: 'BILL_ALREADY_PAID' });
  }

  const { payment_mode, paid_amount, payment_notes } = payload;

  // Determine new status
  const paid = paid_amount || 0;
  let payment_status = 'PARTIAL';
  if (paid >= bill.total_amount) {
    payment_status = 'PAID';
  } else if (paid <= 0) {
    throw new AppError('paid_amount must be greater than 0', { statusCode: 400 });
  }

  const updated = await updateBillPayment(billId, {
    payment_status,
    paid_amount: paid,
    payment_mode: payment_mode || 'CASH',
    payment_notes: payment_notes || '',
  });

  // If fully paid and visit was in BILLING stage, mark visit COMPLETED
  if (payment_status === 'PAID') {
    const visit = await getVisitById(bill.visit_id);
    if (visit && visit.status === 'OPEN') {
      await updateVisitStatus(bill.visit_id, 'COMPLETED');
    }
  }

  return updated;
};

/**
 * List bills for a hospital
 */
const listHospitalBills = async (hospitalId, options) => {
  return listBillsByHospital(hospitalId, options);
};

/**
 * List bills for a patient
 */
const listPatientBills = async (patientId, options) => {
  return listBillsByPatient(patientId, options);
};

module.exports = {
  createVisitBill,
  getBill,
  getVisitBill,
  payBill,
  listHospitalBills,
  listPatientBills,
};
