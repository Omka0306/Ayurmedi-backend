const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createHospital = async (hospital) => {
  const now = new Date().toISOString();
  const item = {
    hospital_id: hospital.hospital_id || uuidv4(),
    hospital_code: hospital.hospital_code,
    name: hospital.name,
    email: hospital.email,
    contact_number: hospital.contact_number,
    address: hospital.address,
    city: hospital.city,
    state: hospital.state,
    country: hospital.country,
    pincode: hospital.pincode,
    registration_no: hospital.registration_no,
    type: hospital.type,
    owner_name: hospital.owner_name,
    website: hospital.website,
    subscription_plan: hospital.subscription_plan,
    subscription_start: hospital.subscription_start || now,
    subscription_end: hospital.subscription_end,
    status: hospital.status || 'ACTIVE',
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.HOSPITALS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(hospital_id)',
    }),
  );

  return item;
};

const getHospitalById = async (hospitalId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.HOSPITALS,
      Key: { hospital_id: hospitalId },
    }),
  );
  return res.Item || null;
};

// Example of lookup by code if we later add a GSI on hospital_code
const getHospitalByCode = async (hospitalCode) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.HOSPITALS,
      IndexName: 'hospital_code-index',
      KeyConditionExpression: 'hospital_code = :code',
      ExpressionAttributeValues: {
        ':code': hospitalCode,
      },
      Limit: 1,
    }),
  );
  return res.Items && res.Items[0] ? res.Items[0] : null;
};

/**
 * Get all hospitals with pagination
 * By default returns only ACTIVE hospitals
 */
const getAllHospitals = async (options = {}) => {
  const { limit = 50, lastKey = null, includeInactive = false } = options;

  const params = {
    TableName: TABLES.HOSPITALS,
    Limit: limit,
  };

  // Filter to show only ACTIVE hospitals by default
  if (!includeInactive) {
    params.FilterExpression = '#status = :active';
    params.ExpressionAttributeNames = {
      '#status': 'status',
    };
    params.ExpressionAttributeValues = {
      ':active': 'ACTIVE',
    };
  }

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const res = await ddb.send(new ScanCommand(params));

  return {
    items: res.Items || [],
    lastKey: res.LastEvaluatedKey || null,
    count: res.Items ? res.Items.length : 0,
  };
};

/**
 * Update hospital details
 */
const updateHospital = async (hospitalId, updates) => {
  const allowedFields = [
    'name',
    'email',
    'contact_number',
    'address',
    'city',
    'state',
    'country',
    'pincode',
    'registration_no',
    'type',
    'owner_name',
    'website',
    'subscription_plan',
    'subscription_start',
    'subscription_end',
    'status',
  ];

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updates[key];
    }
  });

  if (updateExpressions.length === 0) {
    throw new Error('No valid fields to update');
  }

  // Add updated_at timestamp
  updateExpressions.push('#updated_at = :updated_at');
  expressionAttributeNames['#updated_at'] = 'updated_at';
  expressionAttributeValues[':updated_at'] = new Date().toISOString();

  const params = {
    TableName: TABLES.HOSPITALS,
    Key: { hospital_id: hospitalId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const res = await ddb.send(new UpdateCommand(params));
  return res.Attributes;
};

/**
 * Delete hospital (soft delete - set status to INACTIVE)
 */
const deleteHospital = async (hospitalId) => {
  const params = {
    TableName: TABLES.HOSPITALS,
    Key: { hospital_id: hospitalId },
    UpdateExpression: 'SET #status = :status, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updated_at': 'updated_at',
    },
    ExpressionAttributeValues: {
      ':status': 'INACTIVE',
      ':updated_at': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  const res = await ddb.send(new UpdateCommand(params));
  return res.Attributes;
};

module.exports = {
  createHospital,
  getHospitalById,
  getHospitalByCode,
  getAllHospitals,
  updateHospital,
  deleteHospital,
};

