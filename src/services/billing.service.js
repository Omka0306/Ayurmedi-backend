const { v4: uuidv4 } = require('uuid');
const {
  createBill, getBillById, listBillsByPatient, listBillsByHospitalAndDateRange, updateBill,
} = require('../persistence/billing.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { BILL_STATUS, PAYMENT_MODE } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const calculateTotals = (items, discountType, discountValue, taxPercent) => {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  let discountAmount = 0;
  if (discountType === 'PERCENT') discountAmount = (subtotal * discountValue) / 100;
  else if (discountType === 'FIXED') discountAmount = discountValue || 0;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * (taxPercent || 0)) / 100;
  const totalAmount = taxable + taxAmount;
  return { subtotal, discountAmount, taxAmount, totalAmount };
};

const createNewBill = async (payload, authContext) => {
  const { patient_id, items } = payload;
  if (!patient_id || !Array.isArray(items) || items.length === 0)
    throw new AppError('patient_id and items[] are required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const patient = await getPatientById(patient_id);
  if (!patient || patient.hospital_id !== authContext.hospital_id)
    throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });

  const totals = calculateTotals(
    items,
    payload.discount_type,
    payload.discount_value || 0,
    payload.tax_percent || 0,
  );

  return createBill({
    ...payload,
    ...totals,
    patient_name: patient.name,
    hospital_id:  authContext.hospital_id,
    branch_id:    authContext.branch_id || null,
    balance_due:  totals.totalAmount,
    status:       BILL_STATUS.PENDING,
  });
};

const getBill = async (billId, hospitalId) => {
  const bill = await getBillById(billId);
  if (!bill) throw new AppError('Bill not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (bill.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return bill;
};

const recordPayment = async (billId, paymentPayload, hospitalId) => {
  const bill = await getBillById(billId);
  if (!bill) throw new AppError('Bill not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (bill.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  if (bill.status === BILL_STATUS.PAID) throw new AppError('Bill is already fully paid', { statusCode: 409, code: 'ALREADY_PAID' });

  const { amount, mode, reference_no, notes } = paymentPayload;
  if (!amount || amount <= 0) throw new AppError('Payment amount must be positive', { statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!Object.values(PAYMENT_MODE).includes(mode)) throw new AppError('Invalid payment mode', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const payment = {
    payment_id:   uuidv4(),
    amount,
    mode,
    reference_no: reference_no || null,
    notes:        notes || null,
    date:         new Date().toISOString(),
  };

  const newAmountPaid = (bill.amount_paid || 0) + amount;
  const newBalance = Math.max(0, bill.total_amount - newAmountPaid);
  let newStatus = BILL_STATUS.PARTIAL;
  if (newBalance === 0) newStatus = BILL_STATUS.PAID;

  return updateBill(billId, {
    payments:     [...(bill.payments || []), payment],
    amount_paid:  newAmountPaid,
    balance_due:  newBalance,
    status:       newStatus,
  });
};

const listByPatient = async (patientId, hospitalId, pagination) => {
  const patient = await getPatientById(patientId);
  if (!patient || patient.hospital_id !== hospitalId)
    throw new AppError('Patient not found', { statusCode: 404, code: 'NOT_FOUND' });
  return listBillsByPatient(patientId, pagination);
};

module.exports = { createNewBill, getBill, recordPayment, listByPatient, listBillsByHospitalAndDateRange };
