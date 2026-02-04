const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
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

module.exports = {
  createUser,
  getUserById,
  getUserByCognitoId,
};

