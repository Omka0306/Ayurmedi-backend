const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Create prescription for a visit
 */
const createVisitPrescription = async (prescriptionData) => {
  const prescription_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    prescription_id,
    ...prescriptionData,
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.PRESCRIPTIONS,
    Item: item,
  }));

  return item;
};

/**
 * Get prescription by visit_id
 */
const getPrescriptionByVisitId = async (visit_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.PRESCRIPTIONS,
    IndexName: 'visit-prescription-index',
    KeyConditionExpression: 'visit_id = :vid',
    ExpressionAttributeValues: {
      ':vid': visit_id,
    },
    Limit: 1,
  }));

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

/**
 * Get prescription by ID
 */
const getPrescriptionById = async (prescription_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.PRESCRIPTIONS,
    Key: { prescription_id },
  }));

  return result.Item;
};

/**
 * Add prescription item (medicine)
 */
const addPrescriptionItem = async (itemData) => {
  const item_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    item_id,
    ...itemData,
    created_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.PRESCRIPTION_ITEMS,
    Item: item,
  }));

  return item;
};

/**
 * Get all items for a prescription
 */
const getItemsByPrescription = async (prescription_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.PRESCRIPTION_ITEMS,
    IndexName: 'prescription-items-index',
    KeyConditionExpression: 'prescription_id = :pid',
    ExpressionAttributeValues: {
      ':pid': prescription_id,
    },
    ScanIndexForward: true, // Oldest first
  }));

  return result.Items || [];
};

/**
 * Delete prescription item
 */
const removePrescriptionItem = async (item_id) => {
  await docClient.send(new DeleteCommand({
    TableName: TABLES.PRESCRIPTION_ITEMS,
    Key: { item_id },
  }));
};

module.exports = {
  createVisitPrescription,
  getPrescriptionByVisitId,
  getPrescriptionById,
  addPrescriptionItem,
  getItemsByPrescription,
  removePrescriptionItem,
};
