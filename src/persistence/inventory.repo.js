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
 * Add or update inventory stock for a medicine in a hospital
 * (one record per hospital+medicine)
 */
const stockIn = async (hospital_id, medicine_id, { quantity, unit_cost, batch_no, expiry_date, notes }) => {
  const now = new Date().toISOString();

  // Check if record exists
  const existing = await docClient.send(new QueryCommand({
    TableName: TABLES.INVENTORY,
    IndexName: 'hospital-medicine-index',
    KeyConditionExpression: 'hospital_id = :hid AND medicine_id = :mid',
    ExpressionAttributeValues: { ':hid': hospital_id, ':mid': medicine_id },
    Limit: 1,
  }));

  if (existing.Items && existing.Items.length > 0) {
    const inv = existing.Items[0];
    const newQty = inv.quantity + quantity;

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLES.INVENTORY,
      Key: { inventory_id: inv.inventory_id },
      UpdateExpression: `SET quantity = :qty, unit_cost = :uc, last_stock_in = :now,
        batch_no = :bn, expiry_date = :ed, updated_at = :ua`,
      ExpressionAttributeValues: {
        ':qty': newQty,
        ':uc': unit_cost || inv.unit_cost,
        ':now': now,
        ':bn': batch_no || inv.batch_no,
        ':ed': expiry_date || inv.expiry_date,
        ':ua': now,
      },
      ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
  }

  // Create new record
  const item = {
    inventory_id: uuidv4(),
    hospital_id,
    medicine_id,
    quantity,
    unit_cost: unit_cost || 0,
    batch_no: batch_no || null,
    expiry_date: expiry_date || null,
    last_stock_in: now,
    notes: notes || null,
    created_at: now,
    updated_at: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLES.INVENTORY, Item: item }));
  return item;
};

/**
 * Get inventory item by ID
 */
const getInventoryById = async (inventory_id) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLES.INVENTORY,
    Key: { inventory_id },
  }));
  return result.Item || null;
};

/**
 * Get inventory for a specific medicine in a hospital
 */
const getInventoryByMedicine = async (hospital_id, medicine_id) => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLES.INVENTORY,
    IndexName: 'hospital-medicine-index',
    KeyConditionExpression: 'hospital_id = :hid AND medicine_id = :mid',
    ExpressionAttributeValues: { ':hid': hospital_id, ':mid': medicine_id },
    Limit: 1,
  }));
  return result.Items && result.Items[0] ? result.Items[0] : null;
};

/**
 * List all inventory records for a hospital
 */
const listInventoryByHospital = async (hospital_id, options = {}) => {
  const { limit = 50, lastKey = null } = options;

  const params = {
    TableName: TABLES.INVENTORY,
    IndexName: 'hospital-inventory-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospital_id },
    Limit: limit,
  };

  if (lastKey) params.ExclusiveStartKey = lastKey;

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null,
    count: result.Count || 0,
  };
};

/**
 * Deduct stock when medicine is prescribed
 */
const deductStock = async (hospital_id, medicine_id, quantity) => {
  const inv = await getInventoryByMedicine(hospital_id, medicine_id);
  if (!inv) return null; // No inventory tracked — silently skip

  const newQty = Math.max(0, inv.quantity - quantity);
  const now = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.INVENTORY,
    Key: { inventory_id: inv.inventory_id },
    UpdateExpression: 'SET quantity = :qty, updated_at = :ua',
    ExpressionAttributeValues: { ':qty': newQty, ':ua': now },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

/**
 * Manual stock adjustment (increase or decrease)
 */
const adjustStock = async (inventory_id, { adjustment, reason }) => {
  const inv = await getInventoryById(inventory_id);
  if (!inv) return null;

  const newQty = Math.max(0, inv.quantity + adjustment);
  const now = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.INVENTORY,
    Key: { inventory_id },
    UpdateExpression: 'SET quantity = :qty, adjustment_reason = :reason, updated_at = :ua',
    ExpressionAttributeValues: { ':qty': newQty, ':reason': reason || '', ':ua': now },
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
};

module.exports = {
  stockIn,
  getInventoryById,
  getInventoryByMedicine,
  listInventoryByHospital,
  deductStock,
  adjustStock,
};
