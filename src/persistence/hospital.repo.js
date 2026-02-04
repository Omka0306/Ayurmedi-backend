const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createHospital = async (hospital) => {
  const now = new Date().toISOString();
  const item = {
    hospital_id: hospital.hospital_id || uuidv4(),
    hospital_code: hospital.hospital_code,
    name: hospital.name,
    registration_no: hospital.registration_no,
    type: hospital.type,
    owner_name: hospital.owner_name,
    email: hospital.email,
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

module.exports = {
  createHospital,
  getHospitalById,
  getHospitalByCode,
};

