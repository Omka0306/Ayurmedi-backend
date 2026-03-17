const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createConsultation = async (consultation) => {
  const now = new Date().toISOString();
  const item = {
    consultation_id:   consultation.consultation_id || uuidv4(),
    patient_id:        consultation.patient_id,
    hospital_id:       consultation.hospital_id,
    branch_id:         consultation.branch_id || null,
    doctor_id:         consultation.doctor_id,
    doctor_name:       consultation.doctor_name || null,
    consultation_date: consultation.consultation_date || now.split('T')[0],

    // Section A — Psychological assessment (5 questions rated 1–5)
    psych_assessment: consultation.psych_assessment || [],

    // Section B — Substance use
    substance_use: consultation.substance_use || {},

    // Section C — Physical / Abdominal examination
    abdominal_exam: consultation.abdominal_exam || {},
    body_diagram:   consultation.body_diagram || null,

    // Section D — Systemic examination
    systemic_exam: consultation.systemic_exam || {},

    // Section E — Ayurvedic Diagnosis
    dosha_assessment:   consultation.dosha_assessment || null,
    avastha:            consultation.avastha || null,
    treatment_principle:consultation.treatment_principle || null,
    diagnosis_notes:    consultation.diagnosis_notes || null,

    // Vital signs
    vitals: consultation.vitals || {},

    // Daily routine & lifestyle data (Page 2 of Rognpatrak)
    daily_routine:  consultation.daily_routine || {},
    diet_history:   consultation.diet_history || {},
    bowel_habits:   consultation.bowel_habits || {},
    urination:      consultation.urination || {},
    perspiration:   consultation.perspiration || {},
    menstrual:      consultation.menstrual || {},
    reproductive:   consultation.reproductive || {},
    sleep:          consultation.sleep || {},
    eye_screen:     consultation.eye_screen || {},

    status:     consultation.status || 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.CONSULTATIONS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(consultation_id)',
  }));

  return item;
};

const getConsultationById = async (consultationId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.CONSULTATIONS,
    Key: { consultation_id: consultationId },
  }));
  return res.Item || null;
};

const listConsultationsByPatient = async (patientId, { limit = 20, lastKey } = {}) => {
  const params = {
    TableName: TABLES.CONSULTATIONS,
    IndexName: 'patient_id-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patientId },
    ScanIndexForward: false,
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const res = await ddb.send(new QueryCommand(params));
  return { items: res.Items || [], lastKey: res.LastEvaluatedKey || null };
};

const listConsultationsByHospitalAndDate = async (hospitalId, date, { limit = 100 } = {}) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.CONSULTATIONS,
    IndexName: 'hospital_id-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND begins_with(consultation_date, :date)',
    ExpressionAttributeValues: { ':hid': hospitalId, ':date': date },
    Limit: limit,
    ScanIndexForward: false,
  }));
  return res.Items || [];
};

const updateConsultation = async (consultationId, updates) => {
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
    TableName: TABLES.CONSULTATIONS,
    Key: { consultation_id: consultationId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(consultation_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

module.exports = {
  createConsultation,
  getConsultationById,
  listConsultationsByPatient,
  listConsultationsByHospitalAndDate,
  updateConsultation,
};
