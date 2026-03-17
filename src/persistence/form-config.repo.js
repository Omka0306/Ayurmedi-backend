const {
  PutCommand, GetCommand, QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

/**
 * Save (create or overwrite) a form config for a hospital+formType.
 * Uses composite key: hospital_id (PK) + form_type (SK).
 */
const saveFormConfig = async (hospitalId, formType, config) => {
  const now = new Date().toISOString();
  const item = {
    hospital_id: hospitalId,
    form_type:   formType,
    fields:      config.fields || [],
    version:     (config.version || 0) + 1,
    updated_at:  now,
    created_at:  config.created_at || now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.FORM_CONFIGS,
    Item: item,
  }));

  return item;
};

const getFormConfig = async (hospitalId, formType) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.FORM_CONFIGS,
    Key: { hospital_id: hospitalId, form_type: formType },
  }));
  return res.Item || null;
};

const listFormConfigs = async (hospitalId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.FORM_CONFIGS,
    KeyConditionExpression: 'hospital_id = :hid',
    ExpressionAttributeValues: { ':hid': hospitalId },
  }));
  return res.Items || [];
};

module.exports = { saveFormConfig, getFormConfig, listFormConfigs };
