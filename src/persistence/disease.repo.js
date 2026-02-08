const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createDisease = async (disease) => {
  const now = new Date().toISOString();
  const item = {
    disease_id: disease.disease_id || uuidv4(),
    hospital_id: disease.hospital_id || null,
    name_mr: disease.name_mr,
    name_en: disease.name_en || disease.name_mr,
    description: disease.description || null,
    is_active: disease.is_active !== undefined ? disease.is_active : true,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.DISEASES,
      Item: item,
      ConditionExpression: 'attribute_not_exists(disease_id)',
    }),
  );

  return item;
};

const getDiseaseById = async (diseaseId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.DISEASES,
      Key: { disease_id: diseaseId },
    }),
  );
  return res.Item || null;
};

const listDiseases = async (hospitalId = null) => {
  const queries = [
    ddb.send(
      new QueryCommand({
        TableName: TABLES.DISEASES,
        IndexName: 'hospital-diseases-index',
        KeyConditionExpression: 'hospital_id = :hid',
        FilterExpression: 'is_active = :active',
        ExpressionAttributeValues: {
          ':hid': hospitalId || null,
          ':active': true,
        },
      }),
    ),
  ];

  // Also get global diseases if hospital-specific
  if (hospitalId) {
    queries.push(
      ddb.send(
        new QueryCommand({
          TableName: TABLES.DISEASES,
          IndexName: 'hospital-diseases-index',
          KeyConditionExpression: 'hospital_id = :hid',
          FilterExpression: 'is_active = :active',
          ExpressionAttributeValues: {
            ':hid': null,
            ':active': true,
          },
        }),
      ),
    );
  }

  const results = await Promise.all(queries);
  const allItems = results.flatMap((r) => r.Items || []);
  
  // Deduplicate by disease_id, prefer hospital-specific
  const unique = new Map();
  allItems.forEach((item) => {
    if (!unique.has(item.disease_id) || item.hospital_id === hospitalId) {
      unique.set(item.disease_id, item);
    }
  });
  
  return Array.from(unique.values());
};

module.exports = {
  createDisease,
  getDiseaseById,
  listDiseases,
};
