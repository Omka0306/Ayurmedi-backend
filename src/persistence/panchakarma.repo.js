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
 * Create a Panchakarma treatment plan
 */
const createPlan = async (data) => {
  const plan_id = uuidv4();
  const now = new Date().toISOString();
  const item = {
    plan_id,
    ...data,
    status: 'ACTIVE',
    sessions: [],
    created_at: now,
    updated_at: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLES.PANCHAKARMA_PLANS, Item: item }));
  return item;
};

/**
 * Get plan by ID
 */
const getPlanById = async (plan_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Key: { plan_id },
  }));
  return result.Item || null;
};

/**
 * List active plans for a hospital
 */
const listPlansByHospital = async (hospital_id, options = {}) => {
  const { limit = 50, lastKey = null } = options;
  const params = {
    TableName: TABLES.PANCHAKARMA_PLANS,
    IndexName: 'hospital-pk-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospital_id },
    Limit: limit,
    ScanIndexForward: false,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const result = await docClient.send(new QueryCommand(params));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
};

/**
 * List plans for a patient
 */
const listPlansByPatient = async (patient_id, options = {}) => {
  const { limit = 20, lastKey = null } = options;
  const params = {
    TableName: TABLES.PANCHAKARMA_PLANS,
    IndexName: 'patient-pk-index',
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
 * Log a Panchakarma session (daily treatment entry)
 */
const addSession = async (plan_id, session) => {
  const now = new Date().toISOString();
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Key: { plan_id },
    UpdateExpression: 'SET sessions = list_append(if_not_exists(sessions, :empty), :newSession), updated_at = :ua',
    ExpressionAttributeValues: {
      ':empty': [],
      ':newSession': [{ session_id: uuidv4(), ...session, recorded_at: now }],
      ':ua': now,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
};

/**
 * Update plan status (ACTIVE → COMPLETED or CANCELLED)
 */
const updatePlanStatus = async (plan_id, status, notes = null) => {
  const now = new Date().toISOString();
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.PANCHAKARMA_PLANS,
    Key: { plan_id },
    UpdateExpression: 'SET #status = :status, completion_notes = :notes, updated_at = :ua',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status, ':notes': notes, ':ua': now },
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes;
};

module.exports = {
  createPlan,
  getPlanById,
  listPlansByHospital,
  listPlansByPatient,
  addSession,
  updatePlanStatus,
};
