const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES, STOCK_MOVEMENT } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const ddb = getDocumentClient();

// ─── Inventory Items (Master) ──────────────────────────────

const createItem = async (item) => {
  const now = new Date().toISOString();
  const doc = {
    item_id:        item.item_id || uuidv4(),
    hospital_id:    item.hospital_id,
    name:           item.name,
    generic_name:   item.generic_name || null,
    brand_name:     item.brand_name || null,
    category:       item.category,
    unit:           item.unit,
    selling_price:  item.selling_price || 0,
    purchase_price: item.purchase_price || 0,
    current_stock:  item.opening_stock || 0,
    reorder_level:  item.reorder_level || 10,
    supplier_name:  item.supplier_name || null,
    supplier_phone: item.supplier_phone || null,
    expiry_date:    item.expiry_date || null,
    batch_no:       item.batch_no || null,
    hsn_code:       item.hsn_code || null,
    status:         item.status || 'ACTIVE',
    created_at:     now,
    updated_at:     now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.INVENTORY_ITEMS,
    Item: doc,
    ConditionExpression: 'attribute_not_exists(item_id)',
  }));

  return doc;
};

const getItemById = async (itemId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.INVENTORY_ITEMS,
    Key: { item_id: itemId },
  }));
  return res.Item || null;
};

const listItemsByHospital = async (hospitalId, { limit = 200, lastKey } = {}) => {
  const params = {
    TableName: TABLES.INVENTORY_ITEMS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    FilterExpression: '#st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':hid': hospitalId, ':active': 'ACTIVE' },
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const res = await ddb.send(new QueryCommand(params));
  return { items: res.Items || [], lastKey: res.LastEvaluatedKey || null };
};

const updateItem = async (itemId, updates) => {
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
    TableName: TABLES.INVENTORY_ITEMS,
    Key: { item_id: itemId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(item_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

/**
 * Atomically adjust stock level. Delta can be positive (stock-in) or negative (stock-out).
 * Throws if resulting stock would go below zero.
 */
const adjustStock = async (itemId, delta, hospitalId) => {
  try {
    const res = await ddb.send(new UpdateCommand({
      TableName: TABLES.INVENTORY_ITEMS,
      Key: { item_id: itemId },
      UpdateExpression: 'SET current_stock = current_stock + :delta, updated_at = :now',
      ConditionExpression:
        delta < 0
          ? 'attribute_exists(item_id) AND hospital_id = :hid AND current_stock >= :abs_delta'
          : 'attribute_exists(item_id) AND hospital_id = :hid',
      ExpressionAttributeValues: {
        ':delta': delta,
        ':now': new Date().toISOString(),
        ':hid': hospitalId,
        ...(delta < 0 ? { ':abs_delta': Math.abs(delta) } : {}),
      },
      ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new AppError('Insufficient stock or item not found', {
        statusCode: 409,
        code: 'INSUFFICIENT_STOCK',
      });
    }
    throw err;
  }
};

/**
 * Get all items with stock <= reorder_level for a hospital.
 */
const listLowStockItems = async (hospitalId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.INVENTORY_ITEMS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    FilterExpression: 'current_stock <= reorder_level AND #st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':hid': hospitalId, ':active': 'ACTIVE' },
  }));
  return res.Items || [];
};

/**
 * Get items expiring before a given ISO date string.
 */
const listExpiringItems = async (hospitalId, beforeDate) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.INVENTORY_ITEMS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    FilterExpression:
      'expiry_date <= :before AND attribute_exists(expiry_date) AND #st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':hid': hospitalId,
      ':before': beforeDate,
      ':active': 'ACTIVE',
    },
  }));
  return res.Items || [];
};

// ─── Stock Movements ───────────────────────────────────────

const addStockMovement = async (movement) => {
  const now = new Date().toISOString();
  const item = {
    item_id:       movement.item_id,
    movement_id:   movement.movement_id || uuidv4(),
    hospital_id:   movement.hospital_id,
    movement_type: movement.movement_type,
    quantity:      movement.quantity,
    movement_date: movement.movement_date || now.split('T')[0],
    reference_id:  movement.reference_id || null,   // prescription_id / session_id
    reference_type:movement.reference_type || null, // 'PRESCRIPTION' | 'PK_SESSION'
    supplier_name: movement.supplier_name || null,
    batch_no:      movement.batch_no || null,
    expiry_date:   movement.expiry_date || null,
    purchase_price:movement.purchase_price || null,
    notes:         movement.notes || null,
    created_by:    movement.created_by || null,
    created_at:    now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.STOCK_MOVEMENTS,
    Item: item,
  }));

  return item;
};

const listMovementsByItem = async (itemId, { limit = 50, lastKey } = {}) => {
  const params = {
    TableName: TABLES.STOCK_MOVEMENTS,
    KeyConditionExpression: 'item_id = :iid',
    ExpressionAttributeValues: { ':iid': itemId },
    ScanIndexForward: false,
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const res = await ddb.send(new QueryCommand(params));
  return { items: res.Items || [], lastKey: res.LastEvaluatedKey || null };
};

const listMovementsByHospitalAndDateRange = async (hospitalId, fromDate, toDate) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.STOCK_MOVEMENTS,
    IndexName: 'hospital_id-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND movement_date BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':hid': hospitalId,
      ':from': fromDate,
      ':to': toDate,
    },
  }));
  return res.Items || [];
};

module.exports = {
  createItem,
  getItemById,
  listItemsByHospital,
  updateItem,
  adjustStock,
  listLowStockItems,
  listExpiringItems,
  addStockMovement,
  listMovementsByItem,
  listMovementsByHospitalAndDateRange,
};
