const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES, TOKEN_STATUS } = require('../constants/config');

const ddb = getDocumentClient();

/**
 * Create a token. token_number is passed in from service (atomic counter).
 */
const createToken = async (token) => {
  const now = new Date().toISOString();
  const todayDate = now.split('T')[0];
  const item = {
    token_id:        token.token_id || uuidv4(),
    hospital_id:     token.hospital_id,
    branch_id:       token.branch_id || null,
    doctor_id:       token.doctor_id,
    doctor_name:     token.doctor_name || null,
    patient_id:      token.patient_id,
    patient_name:    token.patient_name || null,
    token_number:    token.token_number,
    token_date:      todayDate,
    status:          TOKEN_STATUS.WAITING,
    registered_at:   now,
    called_at:       null,
    completed_at:    null,
    created_at:      now,
    updated_at:      now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.TOKENS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(token_id)',
  }));

  return item;
};

const getTokenById = async (tokenId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.TOKENS,
    Key: { token_id: tokenId },
  }));
  return res.Item || null;
};

const listQueueByHospitalAndDate = async (hospitalId, date, doctorId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.TOKENS,
    IndexName: 'hospital_id-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND token_date = :date',
    FilterExpression: doctorId ? 'doctor_id = :did' : undefined,
    ExpressionAttributeValues: {
      ':hid': hospitalId,
      ':date': date,
      ...(doctorId ? { ':did': doctorId } : {}),
    },
    ScanIndexForward: true,
  }));
  return res.Items || [];
};

const updateTokenStatus = async (tokenId, status, extraFields = {}) => {
  const now = new Date().toISOString();
  const sets = ['#status = :status', 'updated_at = :now'];
  const names = { '#status': 'status' };
  const values = { ':status': status, ':now': now };

  if (status === TOKEN_STATUS.IN_CONSULT) {
    sets.push('called_at = :now');
  }
  if (status === TOKEN_STATUS.COMPLETED) {
    sets.push('completed_at = :now');
  }
  Object.entries(extraFields).forEach(([k, v]) => {
    names[`#${k}`] = k;
    values[`:${k}`] = v;
    sets.push(`#${k} = :${k}`);
  });

  const res = await ddb.send(new UpdateCommand({
    TableName: TABLES.TOKENS,
    Key: { token_id: tokenId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(token_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

/**
 * Get the next sequential token number for a given hospital+doctor+date.
 * Uses atomic DynamoDB counter pattern.
 */
const getNextTokenNumber = async (hospitalId, doctorId, date) => {
  const counterId = `${hospitalId}#${doctorId}#${date}`;
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLES.TOKENS,
    // TOKENS table has only a HASH key (token_id). Store counters as special items.
    Key: { token_id: `counter#${counterId}` },
    UpdateExpression: 'ADD #cnt :one SET hospital_id = :hid',
    ExpressionAttributeNames: { '#cnt': 'counter' },
    ExpressionAttributeValues: {
      ':one': 1,
      ':hid': hospitalId,
    },
    ReturnValues: 'UPDATED_NEW',
  }));
  return res.Attributes.counter;
};

module.exports = {
  createToken,
  getTokenById,
  listQueueByHospitalAndDate,
  updateTokenStatus,
  getNextTokenNumber,
};
