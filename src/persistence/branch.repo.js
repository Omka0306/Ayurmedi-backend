const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const ddb = getDocumentClient();

const createBranch = async (branch) => {
  const now = new Date().toISOString();
  const item = {
    branch_id:   branch.branch_id || uuidv4(),
    hospital_id: branch.hospital_id,
    name:        branch.name,
    address:     branch.address || null,
    phone:       branch.phone || null,
    email:       branch.email || null,
    is_main:     branch.is_main || false,
    status:      branch.status || 'ACTIVE',
    created_at:  now,
    updated_at:  now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.BRANCHES,
    Item: item,
    ConditionExpression: 'attribute_not_exists(branch_id)',
  }));

  return item;
};

const getBranchById = async (branchId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.BRANCHES,
    Key: { branch_id: branchId },
  }));
  return res.Item || null;
};

const listBranchesByHospital = async (hospitalId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.BRANCHES,
    IndexName: 'hospital_id-index',
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospitalId },
  }));
  return res.Items || [];
};

const updateBranch = async (branchId, updates) => {
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
    TableName: TABLES.BRANCHES,
    Key: { branch_id: branchId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(branch_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

module.exports = { createBranch, getBranchById, listBranchesByHospital, updateBranch };
