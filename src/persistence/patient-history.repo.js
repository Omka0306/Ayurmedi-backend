const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Create patient history
 */
const createHistory = async (historyData) => {
  const history_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    history_id,
    ...historyData,
    created_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.PATIENT_HISTORIES,
    Item: item,
  }));

  return item;
};

/**
 * Get history by visit_id
 */
const getHistoryByVisit = async (visit_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.PATIENT_HISTORIES,
    IndexName: 'visit-history-index',
    KeyConditionExpression: 'visit_id = :vid',
    ExpressionAttributeValues: {
      ':vid': visit_id,
    },
    Limit: 1,
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * Delete history by visit_id (for updating)
 */
const deleteHistoryByVisit = async (visit_id) => {
  // First get the history
  const history = await getHistoryByVisit(visit_id);
  
  if (history) {
    await docClient.send(new DeleteCommand({
      TableName: TABLES.PATIENT_HISTORIES,
      Key: { history_id: history.history_id },
    }));
  }

  return history;
};

module.exports = {
  createHistory,
  getHistoryByVisit,
  deleteHistoryByVisit,
};
