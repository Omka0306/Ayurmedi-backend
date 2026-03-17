const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createUser = async (user) => {
  const now = new Date().toISOString();
  const item = {
    user_id:         user.user_id || uuidv4(),
    cognito_user_id: user.cognito_user_id,
    hospital_id:     user.hospital_id,
    branch_id:       user.branch_id || null,
    full_name:       user.full_name,
    mobile:          user.mobile || null,
    email:           user.email,
    role:            user.role,
    specialization:  user.specialization || null,
    avg_consult_mins: user.avg_consult_mins || 15, // for wait-time estimation
    status:          user.status || 'ACTIVE',
    created_at:      now,
    updated_at:      now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.USERS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(user_id)',
  }));

  return item;
};

const getUserById = async (userId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.USERS,
    Key: { user_id: userId },
  }));
  return res.Item || null;
};

const getUserByCognitoId = async (cognitoUserId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.USERS,
    IndexName: 'cognito_user_id-index',
    KeyConditionExpression: 'cognito_user_id = :cid',
    ExpressionAttributeValues: { ':cid': cognitoUserId },
    Limit: 1,
  }));
  return res.Items && res.Items[0] ? res.Items[0] : null;
};

const listUsersByHospital = async (hospitalId, { filterRole } = {}) => {
  const params = {
    TableName: TABLES.USERS,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospitalId },
  };
  if (filterRole) {
    params.FilterExpression = '#role = :role';
    params.ExpressionAttributeNames = { '#role': 'role' };
    params.ExpressionAttributeValues[':role'] = filterRole;
  }
  const res = await ddb.send(new QueryCommand(params));
  return res.Items || [];
};

const updateUser = async (userId, updates) => {
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
    TableName: TABLES.USERS,
    Key: { user_id: userId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(user_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

const deactivateUser = async (userId) => {
  return updateUser(userId, { status: 'INACTIVE' });
};

module.exports = {
  createUser,
  getUserById,
  getUserByCognitoId,
  listUsersByHospital,
  updateUser,
  deactivateUser,
};
