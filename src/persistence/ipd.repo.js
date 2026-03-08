const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Admit a patient for IPD
 */
const admitPatient = async (data) => {
  const ipd_id = uuidv4();
  const now = new Date().toISOString();
  const item = {
    ipd_id,
    ...data,
    status: 'ADMITTED',
    admitted_at: now,
    created_at: now,
    updated_at: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLES.IPD_ADMISSIONS, Item: item }));
  return item;
};

/**
 * Get IPD record by ID
 */
const getIpdById = async (ipd_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.IPD_ADMISSIONS,
    Key: { ipd_id },
  }));
  return result.Item || null;
};

/**
 * List active IPD patients for a hospital
 */
const listActiveIpd = async (hospital_id, options = {}) => {
  const { limit = 50, lastKey = null } = options;
  const params = {
    TableName: TABLES.IPD_ADMISSIONS,
    IndexName: 'hospital-ipd-index',
    KeyConditionExpression: 'hospital_id = :hid',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':hid': hospital_id, ':status': 'ADMITTED' },
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const result = await docClient.send(new QueryCommand(params));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
};

/**
 * List all IPD records for a patient
 */
const listIpdByPatient = async (patient_id, options = {}) => {
  const { limit = 20, lastKey = null } = options;
  const params = {
    TableName: TABLES.IPD_ADMISSIONS,
    IndexName: 'patient-ipd-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patient_id },
    Limit: limit,
    ScanIndexForward: false,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const result = await docClient.send(new QueryCommand(params));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
};

/**
 * Add a daily note/update to IPD record
 */
const addIpdNote = async (ipd_id, note) => {
  const now = new Date().toISOString();
  // Store notes as an array using list_append
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.IPD_ADMISSIONS,
    Key: { ipd_id },
    UpdateExpression: 'SET notes = list_append(if_not_exists(notes, :empty), :newNote), updated_at = :ua',
    ExpressionAttributeValues: {
      ':empty': [],
      ':newNote': [{ ...note, recorded_at: now }],
      ':ua': now,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
};

/**
 * Discharge a patient
 */
const dischargePatient = async (ipd_id, { discharge_notes, discharge_summary }) => {
  const now = new Date().toISOString();
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.IPD_ADMISSIONS,
    Key: { ipd_id },
    UpdateExpression: `SET #status = :status, discharged_at = :da,
      discharge_notes = :dn, discharge_summary = :ds, updated_at = :ua`,
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'DISCHARGED',
      ':da': now,
      ':dn': discharge_notes || null,
      ':ds': discharge_summary || null,
      ':ua': now,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
};

module.exports = {
  admitPatient,
  getIpdById,
  listActiveIpd,
  listIpdByPatient,
  addIpdNote,
  dischargePatient,
};
