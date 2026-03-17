const { listQueueByHospitalAndDate } = require('../persistence/token.repo');
const { listBillsByHospitalAndDateRange } = require('../persistence/billing.repo');
const { listLowStockItems } = require('../persistence/inventory.repo');
const { listPlansByHospital } = require('../persistence/panchakarma.repo');
const { listPatientsByHospital } = require('../persistence/patient.repo');
const { TOKEN_STATUS, PLAN_STATUS } = require('../constants/config');

const getTodaySummary = async (hospitalId) => {
  const today = new Date().toISOString().split('T')[0];

  const [tokens, bills, lowStock, pkPlans] = await Promise.all([
    listQueueByHospitalAndDate(hospitalId, today),
    listBillsByHospitalAndDateRange(hospitalId, today, today, { limit: 500 }),
    listLowStockItems(hospitalId),
    listPlansByHospital(hospitalId),
  ]);

  const waiting    = tokens.filter((t) => t.status === TOKEN_STATUS.WAITING).length;
  const inConsult  = tokens.filter((t) => t.status === TOKEN_STATUS.IN_CONSULT).length;
  const completed  = tokens.filter((t) => t.status === TOKEN_STATUS.COMPLETED).length;
  const totalVisits = tokens.filter((t) => !t.token_id.startsWith('counter#')).length;

  const todayRevenue = bills.reduce((s, b) => s + (b.amount_paid || 0), 0);
  const activePkPlans = pkPlans.filter((p) => p.status === PLAN_STATUS.ACTIVE).length;

  // Doctor-wise breakdown
  const doctorMap = {};
  tokens.filter((t) => !t.token_id.startsWith('counter#')).forEach((t) => {
    if (!doctorMap[t.doctor_id]) doctorMap[t.doctor_id] = { doctor_id: t.doctor_id, doctor_name: t.doctor_name, count: 0 };
    doctorMap[t.doctor_id].count += 1;
  });

  return {
    date:             today,
    total_visits:     totalVisits,
    waiting:          waiting,
    in_consultation:  inConsult,
    completed:        completed,
    today_revenue:    todayRevenue,
    low_stock_count:  lowStock.length,
    active_pk_plans:  activePkPlans,
    by_doctor:        Object.values(doctorMap),
  };
};

const getAnalytics = async (hospitalId, days = 30) => {
  const toDate   = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const [bills, patients] = await Promise.all([
    listBillsByHospitalAndDateRange(hospitalId, fromDate, toDate, { limit: 2000 }),
    listPatientsByHospital(hospitalId, { limit: 2000 }),
  ]);

  // Revenue trend by day
  const revenueByDay = {};
  bills.forEach((b) => {
    if (!revenueByDay[b.bill_date]) revenueByDay[b.bill_date] = 0;
    revenueByDay[b.bill_date] += b.amount_paid || 0;
  });

  // Patient registration trend by day
  const patientByDay = {};
  (patients.items || []).forEach((p) => {
    const day = (p.registered_at || '').split('T')[0];
    if (!patientByDay[day]) patientByDay[day] = 0;
    patientByDay[day] += 1;
  });

  return {
    period_days:    days,
    from:           fromDate,
    to:             toDate,
    total_revenue:  bills.reduce((s, b) => s + (b.amount_paid || 0), 0),
    total_patients: (patients.items || []).length,
    revenue_trend:  Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
    patient_trend:  Object.entries(patientByDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

module.exports = { getTodaySummary, getAnalytics };
