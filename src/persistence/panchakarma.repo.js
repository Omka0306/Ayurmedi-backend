const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES, PLAN_STATUS } = require('../constants/config');

const ddb = getDocumentClient();

// ─── Plans ─────────────────────────────────────────────────

const createPlan = async (plan) => {
  const now = new Date().toISOString();
  const item = {
    plan_id:     plan.plan_id || uuidv4(),
    patient_id:  plan.patient_id,
    hospital_id: plan.hospital_id,
    branch_id:   plan.branch_id || null,
    doctor_id:   plan.doctor_id,
    doctor_name: plan.doctor_name || null,

    // Procedures list (multiple procedures per plan)
    procedures: plan.procedures || [],
    // Each: { procedure_type, total_sessions, session_duration_mins, schedule_notes }

    // Pre-treatment (Poorvakarma)
    poorvakarma: plan.poorvakarma || {},
    // { snehapana_days, snehapana_oil, abhyanga_days, swedana_days, prep_notes }

    // Main procedure (Pradhanakarma)
    pradhanakarma: plan.pradhanakarma || {},
    // { materials: [{ item_id, name, qty_per_session, unit }], procedure_notes }

    // Post-procedure (Pashchatkarma)
    pashchatkarma: plan.pashchatkarma || {},
    // { diet_instructions, rest_days, follow_up_date, post_notes }

    total_sessions:    plan.total_sessions || 0,
    completed_sessions: 0,
    start_date:        plan.start_date || now.split('T')[0],
    end_date:          plan.end_date || null,
    status:            plan.status || PLAN_STATUS.ACTIVE,
    created_at:        now,
    updated_at:        now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(plan_id)',
  }));

  return item;
};

const getPlanById = async (planId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Key: { plan_id: planId },
  }));
  return res.Item || null;
};

const listPlansByPatient = async (patientId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    IndexName: 'patient_id-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patientId },
    ScanIndexForward: false,
  }));
  return res.Items || [];
};

const listPlansByHospital = async (hospitalId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospitalId },
    ScanIndexForward: false,
  }));
  return res.Items || [];
};

const updatePlan = async (planId, updates) => {
  const now = new Date().toISOString();
  const sets = [];
  const names = {};
  const values = { ':now': now };

  Object.entries(updates).forEach(([k, v]) => {
    names[`#${k}`] = k;
    values[`:${k}`] = v;
    sets.push(`#${k} = :${k}`);
  });
  sets.push('updated_at = :now');

  const res = await ddb.send(new UpdateCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Key: { plan_id: planId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(plan_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

// ─── Sessions ──────────────────────────────────────────────

const addSession = async (session) => {
  const now = new Date().toISOString();
  const item = {
    plan_id:      session.plan_id,
    session_id:   session.session_id || uuidv4(),
    session_date: session.session_date || now.split('T')[0],
    session_time: session.session_time || null,
    session_no:   session.session_no,

    // Therapist who performed
    therapist_id:   session.therapist_id || null,
    therapist_name: session.therapist_name || null,
    duration_mins:  session.duration_mins || null,

    // Vitals before/after
    vitals_before: session.vitals_before || {},
    vitals_after:  session.vitals_after || {},

    // Materials used (triggers inventory deduction)
    materials_used: session.materials_used || [],
    // Each: { item_id, name, qty_used, unit }

    // Doctor observations
    observations:  session.observations || null,
    doctor_notes:  session.doctor_notes || null,

    status:     session.status || 'COMPLETED',
    created_at: now,
    updated_at: now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.PANCHAKARMA_SESSIONS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(session_id)',
  }));

  return item;
};

const listSessionsByPlan = async (planId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.PANCHAKARMA_SESSIONS,
    KeyConditionExpression: 'plan_id = :pid',
    ExpressionAttributeValues: { ':pid': planId },
    ScanIndexForward: true,
  }));
  return res.Items || [];
};

/**
 * Find a session when you only have session_id.
 * Panchakarma sessions table uses (plan_id, session_id) as key, so this does a Scan fallback.
 */
const findSessionById = async (sessionId) => {
  const res = await ddb.send(new ScanCommand({
    TableName: TABLES.PANCHAKARMA_SESSIONS,
    FilterExpression: 'session_id = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
    Limit: 1,
  }));
  return (res.Items && res.Items[0]) || null;
};

const updateSession = async (planId, sessionId, updates) => {
  const now = new Date().toISOString();
  const sets = [];
  const names = {};
  const values = { ':now': now };

  Object.entries(updates).forEach(([k, v]) => {
    names[`#${k}`] = k;
    values[`:${k}`] = v;
    sets.push(`#${k} = :${k}`);
  });
  sets.push('updated_at = :now');

  const res = await ddb.send(new UpdateCommand({
    TableName: TABLES.PANCHAKARMA_SESSIONS,
    Key: { plan_id: planId, session_id: sessionId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(session_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

module.exports = {
  createPlan,
  getPlanById,
  listPlansByPatient,
  listPlansByHospital,
  updatePlan,
  addSession,
  listSessionsByPlan,
  findSessionById,
  updateSession,
};
