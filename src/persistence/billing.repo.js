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
 * Create a new bill for a visit
 */
const createBill = async (billData) => {
  const bill_id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    bill_id,
    ...billData,
    payment_status: 'PENDING',
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLES.BILLING,
    Item: item,
  }));

  return item;
};

/**
 * Get bill by ID
 */
const getBillById = async (bill_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.BILLING,
    Key: { bill_id },
  }));
  return result.Item || null;
};

/**
 * Get bill by visit ID
 */
const getBillByVisitId = async (visit_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.BILLING,
    IndexName: 'visit-bill-index',
    KeyConditionExpression: 'visit_id = :vid',
    ExpressionAttributeValues: { ':vid': visit_id },
    Limit: 1,
  }));
  return result.Items && result.Items[0] ? result.Items[0] : null;
};

/**
 * Update bill payment status (PAID / PARTIAL / CANCELLED)
 */
const updateBillPayment = async (bill_id, { payment_status, paid_amount, payment_mode, payment_notes }) => {
  const now = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.BILLING,
    Key: { bill_id },
    UpdateExpression: `SET payment_status = :ps, paid_amount = :pa, payment_mode = :pm,
      payment_notes = :pn, paid_at = :paid_at, updated_at = :ua`,
    ExpressionAttributeValues: {
      ':ps': payment_status,
      ':pa': paid_amount || 0,
      ':pm': payment_mode || null,
      ':pn': payment_notes || null,
      ':paid_at': payment_status === 'PAID' ? now : null,
      ':ua': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

/**
 * List bills for a hospital with optional filters
 */
const listBillsByHospital = async (hospital_id, options = {}) => {
  const { limit = 20, lastKey = null, payment_status = null } = options;

  const params = {
    TableName: TABLES.BILLING,
    IndexName: 'hospital-bill-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospital_id },
    Limit: limit,
    ScanIndexForward: false, // newest first
  };

  if (payment_status) {
    params.FilterExpression = 'payment_status = :ps';
    params.ExpressionAttributeValues[':ps'] = payment_status;
  }

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null,
    count: result.Count || 0,
  };
};

/**
 * List bills for a specific patient
 */
const listBillsByPatient = async (patient_id, options = {}) => {
  const { limit = 20, lastKey = null } = options;

  const params = {
    TableName: TABLES.BILLING,
    IndexName: 'patient-bill-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patient_id },
    Limit: limit,
    ScanIndexForward: false,
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null,
  };
};

module.exports = {
  createBill,
  getBillById,
  getBillByVisitId,
  updateBillPayment,
  listBillsByHospital,
  listBillsByPatient,
};
