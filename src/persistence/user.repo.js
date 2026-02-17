const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createUser = async (user) => {
  const now = new Date().toISOString();
  const item = {
    user_id: user.user_id || uuidv4(),
    cognito_user_id: user.cognito_user_id,
    hospital_id: user.hospital_id,
    branch_id: user.branch_id || null,
    full_name: user.full_name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    status: user.status || 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.USERS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(user_id)',
    }),
  );

  return item;
};

const getUserById = async (userId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: { user_id: userId },
    }),
  );
  return res.Item || null;
};

const getUserByCognitoId = async (cognitoUserId) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'cognito_user_id-index',
      KeyConditionExpression: 'cognito_user_id = :cid',
      ExpressionAttributeValues: {
        ':cid': cognitoUserId,
      },
      Limit: 1,
    }),
  );
  return res.Items && res.Items[0] ? res.Items[0] : null;
};

const getAllUsers = async (options = {}) => {
  const { limit = 50, lastKey = null, includeInactive = false } = options;

  const params = {
    TableName: TABLES.USERS,
    Limit: limit,
  };

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

const getUsersByHospital = async (hospitalId, options = {}) => {
  const { limit = 50, lastKey = null, includeInactive = false, role = null } = options;

  const params = {
    TableName: TABLES.USERS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: {
      ':hid': hospitalId,
    },
    Limit: limit,
  };

  const filterExpressions = [];
  const expressionAttributeNames = {};
  
  if (!includeInactive) {
    filterExpressions.push('#status = :active');
    expressionAttributeNames['#status'] = 'status';
    params.ExpressionAttributeValues[':active'] = 'ACTIVE';
  }

  if (role) {
    filterExpressions.push('#role = :role');
    expressionAttributeNames['#role'] = 'role';
    params.ExpressionAttributeValues[':role'] = role;
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
    params.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const res = await ddb.send(new QueryCommand(params));

  return {
    items: res.Items || [],
    lastKey: res.LastEvaluatedKey || null,
    count: res.Items ? res.Items.length : 0,
  };
};

const updateUser = async (userId, updates) => {
  const allowedFields = [
    'full_name',
    'mobile',
    'branch_id',
    'role',
    'status',
  ];

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  updates.updated_at = new Date().toISOString();
  allowedFields.push('updated_at');

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updates[key];
    }
  });

  if (updateExpressions.length === 0) {
    return null; // Nothing to update
  }

  const params = {
    TableName: TABLES.USERS,
    Key: { user_id: userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const res = await ddb.send(new UpdateCommand(params));
  return res.Attributes;
};

const deleteUser = async (userId) => {
  const params = {
    TableName: TABLES.USERS,
    Key: { user_id: userId },
    UpdateExpression: '#status = :status, #updated_at = :updated_at',
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
  createUser,
  getUserById,
  getUserByCognitoId,
  getAllUsers,
  getUsersByHospital,
  updateUser,
  deleteUser,
};

