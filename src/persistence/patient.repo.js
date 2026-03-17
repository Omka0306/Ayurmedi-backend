const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createPatient = async (patient) => {
  const now = new Date().toISOString();
  const item = {
    patient_id:         patient.patient_id || uuidv4(),
    hospital_id:        patient.hospital_id,
    branch_id:          patient.branch_id || null,
    registration_no:    patient.registration_no || null,
    // Section B — Basic info
    name:               patient.name,
    address:            patient.address || null,
    age:                patient.age || null,
    birth_date_time:    patient.birth_date_time || null,
    birthplace:         patient.birthplace || null,
    gender:             patient.gender || null,
    email:              patient.email || null,
    phone:              patient.phone || null,
    mobile:             patient.mobile,
    education:          patient.education || null,
    weight_kg:          patient.weight_kg || null,
    profession:         patient.profession || null,
    spouse_occupation:  patient.spouse_occupation || null,
    // Chief complaint
    chief_complaint:       patient.chief_complaint || null,
    complaint_duration:    patient.complaint_duration || null,
    relief_factors:        patient.relief_factors || null,
    // Section D — Current medications
    current_medications:   patient.current_medications || [],
    // Section E — Medical History
    medical_history:       patient.medical_history || {},
    // Section F — Family History
    family_history:        patient.family_history || {},
    // Section G — Marital/Reproductive
    marital_history:       patient.marital_history || {},
    // Doctor assignment
    doctor_id:             patient.doctor_id || null,
    doctor_name:           patient.doctor_name || null,
    // Status
    status:                patient.status || 'ACTIVE',
    registered_at:         now,
    created_at:            now,
    updated_at:            now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.PATIENTS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(patient_id)',
  }));

  return item;
};

const getPatientById = async (patientId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.PATIENTS,
    Key: { patient_id: patientId },
  }));
  return res.Item || null;
};

const listPatientsByHospital = async (hospitalId, { limit = 50, lastKey } = {}) => {
  const params = {
    TableName: TABLES.PATIENTS,
    IndexName: 'hospital_id-date-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospitalId },
    ScanIndexForward: false,
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;

  const res = await ddb.send(new QueryCommand(params));
  return { items: res.Items || [], lastKey: res.LastEvaluatedKey || null };
};

const searchPatients = async (hospitalId, searchTerm) => {
  // Scan with filter on mobile or name (simple contains approach)
  const res = await ddb.send(new ScanCommand({
    TableName: TABLES.PATIENTS,
    FilterExpression:
      'hospital_id = :hid AND (contains(#nm, :term) OR contains(mobile, :term))',
    ExpressionAttributeNames: { '#nm': 'name' },
    ExpressionAttributeValues: {
      ':hid': hospitalId,
      ':term': searchTerm,
    },
    Limit: 50,
  }));
  return res.Items || [];
};

const updatePatient = async (patientId, updates) => {
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
    TableName: TABLES.PATIENTS,
    Key: { patient_id: patientId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(patient_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

module.exports = {
  createPatient,
  getPatientById,
  listPatientsByHospital,
  searchPatients,
  updatePatient,
};
