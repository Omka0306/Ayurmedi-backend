const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Create a new patient
 */
const createPatient = async (patientData) => {
  const patient_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    patient_id,
    ...patientData,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.PATIENTS,
    Item: item,
  }));

  return item;
};

/**
 * Get patient by ID
 */
const getPatientById = async (patient_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.PATIENTS,
    Key: { patient_id },
  }));

  return result.Item;
};

/**
 * Check if mobile exists for a hospital
 */
const checkMobileExists = async (hospital_id, mobile) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.PATIENTS,
    IndexName: 'hospital-mobile-index',
    KeyConditionExpression: 'hospital_id = :hid AND mobile = :mobile',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':mobile': mobile,
    },
    Limit: 1,
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * Search patients by name or mobile
 */
const searchPatients = async (hospital_id, searchQuery) => {
  // Search by mobile first (exact match)
  const mobileResult = await docClient.send(new QueryCommand({
    TableName: TABLES.PATIENTS,
    IndexName: 'hospital-mobile-index',
    KeyConditionExpression: 'hospital_id = :hid AND mobile = :mobile',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':mobile': searchQuery,
      ':status': 'ACTIVE',
    },
  }));

  if (mobileResult.Items && mobileResult.Items.length > 0) {
    return mobileResult.Items;
  }

  // Search by name (starts with)
  const nameResult = await docClient.send(new QueryCommand({
    TableName: TABLES.PATIENTS,
    IndexName: 'hospital-name-index',
    KeyConditionExpression: 'hospital_id = :hid AND begins_with(full_name, :name)',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':name': searchQuery,
      ':status': 'ACTIVE',
    },
  }));

  return nameResult.Items || [];
};

/**
 * List patients with pagination
 */
const listPatients = async (hospital_id, options = {}) => {
  const { limit = 20, lastKey = null } = options;

  const params = {
    TableName: TABLES.PATIENTS,
    IndexName: 'hospital-name-index',
    KeyConditionExpression: 'hospital_id = :hid',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':status': 'ACTIVE',
    },
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const result = await docClient.send(new QueryCommand(params));

  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey,
    hasMore: !!result.LastEvaluatedKey,
  };
};

module.exports = {
  createPatient,
  getPatientById,
  checkMobileExists,
  searchPatients,
  listPatients,
};
