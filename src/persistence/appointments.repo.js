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
 * Create an appointment
 */
const createAppointment = async (data) => {
  const appointment_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    appointment_id,
    ...data,
    status: 'SCHEDULED',
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.APPOINTMENTS,
    Item: item,
  }));

  return item;
};

/**
 * Get appointment by ID
 */
const getAppointmentById = async (appointment_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.APPOINTMENTS,
    Key: { appointment_id },
  }));
  return result.Item || null;
};

/**
 * List appointments for a hospital on a specific date
 */
const listAppointmentsByDate = async (hospital_id, date, options = {}) => {
  const { limit = 50, lastKey = null } = options;

  const params = {
    TableName: TABLES.APPOINTMENTS,
    IndexName: 'hospital-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND appointment_date = :date',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':date': date,
    },
    Limit: limit,
    ScanIndexForward: true, // chronological order
  };

  if (lastKey) params.ExclusiveStartKey = lastKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null,
  };
};

/**
 * List appointments for a patient
 */
const listAppointmentsByPatient = async (patient_id, options = {}) => {
  const { limit = 20, lastKey = null } = options;

  const params = {
    TableName: TABLES.APPOINTMENTS,
    IndexName: 'patient-appointment-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patient_id },
    Limit: limit,
    ScanIndexForward: false,
  };

  if (lastKey) params.ExclusiveStartKey = lastKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null,
  };
};

/**
 * List appointments for a specific doctor
 */
const listAppointmentsByDoctor = async (hospital_id, doctor_id, date, options = {}) => {
  const { limit = 50 } = options;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.APPOINTMENTS,
    IndexName: 'hospital-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND appointment_date = :date',
    FilterExpression: 'doctor_id = :did',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':date': date,
      ':did': doctor_id,
    },
    Limit: limit,
  }));

  return result.Items || [];
};

/**
 * Update appointment status
 */
const updateAppointmentStatus = async (appointment_id, status, notes = null) => {
  const now = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.APPOINTMENTS,
    Key: { appointment_id },
    UpdateExpression: 'SET #status = :status, notes = :notes, updated_at = :ua',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':notes': notes,
      ':ua': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

module.exports = {
  createAppointment,
  getAppointmentById,
  listAppointmentsByDate,
  listAppointmentsByPatient,
  listAppointmentsByDoctor,
  updateAppointmentStatus,
};
