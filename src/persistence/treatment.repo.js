const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createTreatment = async (treatment) => {
  const now = new Date().toISOString();
  const item = {
    treatment_id: treatment.treatment_id || uuidv4(),
    disease_id: treatment.disease_id,
    hospital_id: treatment.hospital_id || null,
    title_mr: treatment.title_mr,
    title_en: treatment.title_en || treatment.title_mr,
    notes: treatment.notes || null,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.TREATMENTS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(treatment_id)',
    }),
  );

  return item;
};

const getTreatmentById = async (treatmentId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.TREATMENTS,
      Key: { treatment_id: treatmentId },
    }),
  );
  return res.Item || null;
};

const listTreatmentsByDisease = async (diseaseId, hospitalId = null) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.TREATMENTS,
      IndexName: 'disease-treatments-index',
      KeyConditionExpression: 'disease_id = :did',
      ExpressionAttributeValues: {
        ':did': diseaseId,
      },
    }),
  );

  // Filter by hospital if specified, or show all
  const items = res.Items || [];
  if (hospitalId) {
    return items.filter((item) => item.hospital_id === hospitalId || item.hospital_id === null);
  }
  return items;
};

module.exports = {
  createTreatment,
  getTreatmentById,
  listTreatmentsByDisease,
};
