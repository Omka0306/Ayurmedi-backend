import ioredis from "ioredis";
import { get, query } from "../../common/db.js";
import { AuthError } from "../../common/errors.js";
import { getAlertsLowStock, getAlertsExpiry } from "../../modules/reports/service.js";

const redis = new ioredis(process.env.REDIS_URL, { lazyConnect: true });

export const getAdminDashboard = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const today = new Date().toISOString().split("T")[0];

  // 1. Fetch real-time token/queue data from Redis
  let totalPatients = 0, waitingPatients = 0, inConsultation = 0, completed = 0;
  let doctorDistribution = [];

  // Redis Keys structure from Phase 9: queue:{hospitalId}:{branchId}:{doctorId}:{date}
  // Instead of scanning keys dynamically if branchId/doctorId aren't known centrally here, 
  // we can just fetch via DB for "today". Or map known doctors.
  // We'll rely on DB fetch for active counts today since it's an admin dashboard.
  const consultsResult = await query({
    IndexName: "GSI2",
    KeyConditionExpression: "hospitalId = :hosp AND begins_with(createdAt, :date)",
    ExpressionAttributeValues: { ":hosp": hospitalId, ":date": today }
  });
  
  const consults = (consultsResult.Items || []).filter(c => c.entityType === "CONSULTATION");
  const docCountMap = {};
  consults.forEach(c => {
    totalPatients++;
    if (c.status === "WAITING") waitingPatients++;
    else if (c.status === "IN_CONSULTATION") inConsultation++;
    else if (c.status === "COMPLETED") completed++;
    
    if (!docCountMap[c.doctorId]) docCountMap[c.doctorId] = { doctorName: c.doctorName || c.doctorId, count: 0 };
    docCountMap[c.doctorId].count++;
  });
  
  doctorDistribution = Object.values(docCountMap).map(d => ({ doctorName: d.doctorName, patientsToday: d.count }));

  // 2. Revenue Today
  const billsResult = await query({
    IndexName: "GSI1",
    KeyConditionExpression: "#pk = :hosp AND #sk = :date",
    ExpressionAttributeNames: { "#pk": "GSI1-PK", "#sk": "GSI1-SK" },
    ExpressionAttributeValues: { ":hosp": `HOSP#${hospitalId}`, ":date": `DATE#${today}` }
  });
  const bills = (billsResult.Items || []).filter(b => b.entityType === "BILL");
  
  let revenueCollected = 0;
  let pendingBillsCount = 0;
  bills.forEach(b => {
    revenueCollected += (b.amountPaid || 0);
    if (b.balanceDue > 0 && b.status !== "CANCELLED") pendingBillsCount++;
  });

  // 3. Alerts
  const lowStockResult = await getAlertsLowStock(caller, hospitalId);
  const expiringResult = await getAlertsExpiry(caller, hospitalId);

  // 4. Precomputed Analytics (from yesterday/midnight)
  // Get yesterday's date or today's date if cron already ran.
  const kpiDate = new Date();
  kpiDate.setUTCDate(kpiDate.getUTCDate() - 1);
  const kpiDateStr = kpiDate.toISOString().split("T")[0];

  let analyticsResult = await get({ PK: `DASHBOARD#HOSP#${hospitalId}`, SK: `DATE#${today}` });
  if (!analyticsResult) {
    // try previous day
    analyticsResult = await get({ PK: `DASHBOARD#HOSP#${hospitalId}`, SK: `DATE#${kpiDateStr}` });
  }

  const analytics = analyticsResult || {
    patientGrowth: [], topComplaints: [], revenueTrend: [], doctorPerformance: [], inventoryTurnover: [], pkUtilization: []
  };

  return {
    today: {
      totalPatients,
      waitingPatients,
      inConsultation,
      completed,
      revenueCollected,
      activePkPatients: 0, // Mock for now
      pkSessionsToday: 0   // Mock for now
    },
    alerts: {
      lowStockCount: lowStockResult.length,
      expiringCount: expiringResult.length,
      pendingBillsCount,
      upcomingFollowupsCount: 0 // Mock
    },
    doctorDistribution,
    analytics: {
      patientGrowth: analytics.patientGrowth,
      topComplaints: analytics.topComplaints,
      revenueTrend: analytics.revenueTrend,
      doctorPerformance: analytics.doctorPerformance,
      inventoryTurnover: analytics.inventoryTurnover,
      pkUtilization: analytics.pkUtilization
    }
  };
};

export const getDoctorDashboard = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const today = new Date().toISOString().split("T")[0];
  const { userId } = caller;

  const consultsResult = await query({
    IndexName: "GSI2",
    KeyConditionExpression: "hospitalId = :hosp AND begins_with(createdAt, :date)",
    ExpressionAttributeValues: { ":hosp": hospitalId, ":date": today }
  });
  
  const consults = (consultsResult.Items || []).filter(c => c.entityType === "CONSULTATION" && c.doctorId === userId);
  
  return {
    doctorId: userId,
    today: {
      totalPatients: consults.length,
      waitingPatients: consults.filter(c => c.status === "WAITING").length,
      inConsultation: consults.filter(c => c.status === "IN_CONSULTATION").length,
      completed: consults.filter(c => c.status === "COMPLETED").length,
    },
    consultationsList: consults.map(c => ({ consultId: c.consultId, patientId: c.patientId, status: c.status, time: c.createdAt }))
  };
};

export const getReceptionDashboard = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const today = new Date().toISOString().split("T")[0];

  const consultsResult = await query({
    IndexName: "GSI2",
    KeyConditionExpression: "hospitalId = :hosp AND begins_with(createdAt, :date)",
    ExpressionAttributeValues: { ":hosp": hospitalId, ":date": today }
  });
  const consults = (consultsResult.Items || []).filter(c => c.entityType === "CONSULTATION");

  const billsResult = await query({
    IndexName: "GSI1",
    KeyConditionExpression: "#pk = :hosp AND #sk = :date",
    ExpressionAttributeNames: { "#pk": "GSI1-PK", "#sk": "GSI1-SK" },
    ExpressionAttributeValues: { ":hosp": `HOSP#${hospitalId}`, ":date": `DATE#${today}` }
  });
  const bills = (billsResult.Items || []).filter(b => b.entityType === "BILL");
  const pendingBills = bills.filter(b => b.balanceDue > 0 && b.status !== "CANCELLED");

  return {
    today: {
      totalRegistrations: consults.length,
      waitingPatients: consults.filter(c => c.status === "WAITING").length,
    },
    pendingBillsAlerts: pendingBills.map(b => ({
      billId: b.billId,
      patientId: b.patientId,
      balanceDue: b.balanceDue
    }))
  };
};
