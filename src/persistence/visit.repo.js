const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Create a new visit
 */
const createVisit = async (visitData) => {
  const visit_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    visit_id,
    ...visitData,
    status: 'OPEN',
    stage: 'WAITING_FOR_HISTORY',
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.VISITS,
    Item: item,
  }));

  return item;
};

/**
 * Get visit by ID
 */
const getVisitById = async (visit_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.VISITS,
    Key: { visit_id },
  }));

  return result.Item;
};

/**
 * Check if patient has an open visit
 */
const checkOpenVisit = async (patient_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.VISITS,
    IndexName: 'patient-created-index',
    KeyConditionExpression: 'patient_id = :pid',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':pid': patient_id,
      ':status': 'OPEN',
    },
    Limit: 1,
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * Get visits by stage (Queue)
 */
const getVisitsByStage = async (hospital_id, stage) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.VISITS,
    IndexName: 'hospital-stage-index',
    KeyConditionExpression: 'hospital_id = :hid AND stage = :stage',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':stage': stage,
      ':status': 'OPEN',
    },
    ScanIndexForward: true, // Oldest first
  }));

  return result.Items || [];
};

/**
 * Get visits by patient
 */
const getVisitsByPatient = async (patient_id, options = {}) => {
  const { limit = 20 } = options;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.VISITS,
    IndexName: 'patient-created-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: {
      ':pid': patient_id,
    },
    Limit: limit,
    ScanIndexForward: false, // Newest first
  }));

  return result.Items || [];
};

/**
 * Update visit stage
 */
const updateVisitStage = async (visit_id, stage) => {
  const now = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.VISITS,
    Key: { visit_id },
    UpdateExpression: 'SET stage = :stage, updated_at = :updated',
    ExpressionAttributeValues: {
      ':stage': stage,
      ':updated': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

/**
 * Update visit status
 */
const updateVisitStatus = async (visit_id, status) => {
  const now = new Date().toISOString();

  const updateExpression = status === 'COMPLETED'
    ? 'SET #status = :status, stage = :stage, updated_at = :updated, completed_at = :completed'
    : 'SET #status = :status, updated_at = :updated';

  const expressionValues = {
    ':status': status,
    ':stage': 'READY_FOR_BILLING',
    ':updated': now,
  };

  if (status === 'COMPLETED') {
    expressionValues[':completed'] = now;
  }

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.VISITS,
    Key: { visit_id },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: expressionValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

module.exports = {
  createVisit,
  getVisitById,
  checkOpenVisit,
  getVisitsByStage,
  getVisitsByPatient,
  updateVisitStage,
  updateVisitStatus,
};
