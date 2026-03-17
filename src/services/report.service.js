const { listConsultationsByHospitalAndDate } = require('../persistence/consultation.repo');
const { listBillsByHospitalAndDateRange } = require('../persistence/billing.repo');
const { listMovementsByHospitalAndDateRange, listLowStockItems } = require('../persistence/inventory.repo');
const { listPatientsByHospital } = require('../persistence/patient.repo');

const getDailyOpdReport = async (hospitalId, date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const consultations = await listConsultationsByHospitalAndDate(hospitalId, targetDate, { limit: 500 });

  // Group by doctor
  const byDoctor = {};
  consultations.forEach((c) => {
    const key = c.doctor_id;
    if (!byDoctor[key]) byDoctor[key] = { doctor_id: c.doctor_id, doctor_name: c.doctor_name, count: 0 };
    byDoctor[key].count += 1;
  });

  return {
    date: targetDate,
    total_patients: consultations.length,
    by_doctor: Object.values(byDoctor),
    consultations,
  };
};

const getRevenueReport = async (hospitalId, fromDate, toDate) => {
  const bills = await listBillsByHospitalAndDateRange(hospitalId, fromDate, toDate, { limit: 1000 });

  const totalRevenue = bills.reduce((s, b) => s + (b.amount_paid || 0), 0);
  const totalBilled  = bills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalPending = bills.reduce((s, b) => s + (b.balance_due || 0), 0);

  // Daily breakdown
  const dailyMap = {};
  bills.forEach((b) => {
    if (!dailyMap[b.bill_date]) dailyMap[b.bill_date] = { date: b.bill_date, billed: 0, collected: 0, count: 0 };
    dailyMap[b.bill_date].billed    += b.total_amount || 0;
    dailyMap[b.bill_date].collected += b.amount_paid || 0;
    dailyMap[b.bill_date].count     += 1;
  });

  return {
    from: fromDate,
    to:   toDate,
    total_billed:  totalBilled,
    total_collected: totalRevenue,
    total_pending: totalPending,
    daily_breakdown: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    bills,
  };
};

const getInventoryUsageReport = async (hospitalId, fromDate, toDate) => {
  const movements = await listMovementsByHospitalAndDateRange(hospitalId, fromDate, toDate);
  // Group by item
  const itemMap = {};
  movements.forEach((m) => {
    if (m.movement_type !== 'DISPENSED') return;
    if (!itemMap[m.item_id]) itemMap[m.item_id] = { item_id: m.item_id, total_dispensed: 0, count: 0 };
    itemMap[m.item_id].total_dispensed += m.quantity || 0;
    itemMap[m.item_id].count           += 1;
  });
  return {
    from: fromDate, to: toDate,
    usage: Object.values(itemMap).sort((a, b) => b.total_dispensed - a.total_dispensed),
  };
};

const getLowStockReport = async (hospitalId) => {
  const items = await listLowStockItems(hospitalId);
  return { hospital_id: hospitalId, low_stock_count: items.length, items };
};

const getPatientHistoryReport = async (patientId, hospitalId) => {
  const { getPatientById } = require('../persistence/patient.repo');
  const { listConsultationsByPatient } = require('../persistence/consultation.repo');
  const { listPrescriptionsByPatient } = require('../persistence/prescription.repo');
  const { listPlansByPatient } = require('../persistence/panchakarma.repo');
  const { listBillsByPatient } = require('../persistence/billing.repo');

  const patient = await getPatientById(patientId);
  if (!patient || patient.hospital_id !== hospitalId) return null;

  const [consultRes, prescRes, pkPlans, billRes] = await Promise.all([
    listConsultationsByPatient(patientId, { limit: 100 }),
    listPrescriptionsByPatient(patientId, { limit: 100 }),
    listPlansByPatient(patientId),
    listBillsByPatient(patientId, { limit: 100 }),
  ]);

  return {
    patient,
    consultations:  consultRes.items,
    prescriptions:  prescRes.items,
    panchakarma_plans: pkPlans,
    bills:          billRes.items,
    generated_at:   new Date().toISOString(),
  };
};

module.exports = {
  getDailyOpdReport,
  getRevenueReport,
  getInventoryUsageReport,
  getLowStockReport,
  getPatientHistoryReport,
};
