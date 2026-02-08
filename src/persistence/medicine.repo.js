const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createMedicine = async (medicine) => {
  const now = new Date().toISOString();
  const item = {
    medicine_id: medicine.medicine_id || uuidv4(),
    hospital_id: medicine.hospital_id || null,
    name_mr: medicine.name_mr,
    name_en: medicine.name_en || medicine.name_mr,
    medicine_type: medicine.medicine_type,
    price: medicine.price || 0,
    is_active: medicine.is_active !== undefined ? medicine.is_active : true,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.MEDICINES,
      Item: item,
      ConditionExpression: 'attribute_not_exists(medicine_id)',
    }),
  );

  return item;
};

const getMedicineById = async (medicineId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.MEDICINES,
      Key: { medicine_id: medicineId },
    }),
  );
  return res.Item || null;
};

const listMedicinesByType = async (hospitalId, medicineType) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.MEDICINES,
      IndexName: 'hospital-type-index',
      KeyConditionExpression: 'hospital_id = :hid AND medicine_type = :type',
      FilterExpression: 'is_active = :active',
      ExpressionAttributeValues: {
        ':hid': hospitalId || 'GLOBAL', // Use 'GLOBAL' for global medicines
        ':type': medicineType,
        ':active': true,
      },
    }),
  );
  return res.Items || [];
};

const listAllMedicines = async (hospitalId = null) => {
  // Scan for all medicines (both global and hospital-specific)
  const params = {
    TableName: TABLES.MEDICINES,
    FilterExpression: 'is_active = :active',
    ExpressionAttributeValues: {
      ':active': true,
    },
  };

  const res = await ddb.send(new ScanCommand(params));
  const allMedicines = res.Items || [];
  
  // Filter to include global medicines + hospital-specific medicines
  const filtered = allMedicines.filter(
    (med) => med.hospital_id === 'GLOBAL' || med.hospital_id === hospitalId
  );
  
  return filtered;
};

const searchMedicines = async (hospitalId, searchQuery) => {
  // Search in both global (hospital_id = 'GLOBAL') and hospital-specific medicines
  const queries = [
    ddb.send(
      new QueryCommand({
        TableName: TABLES.MEDICINES,
        IndexName: 'hospital-name-index',
        KeyConditionExpression: 'hospital_id = :hid',
        FilterExpression: '(contains(name_mr, :q) OR contains(name_en, :q)) AND is_active = :active',
        ExpressionAttributeValues: {
          ':hid': hospitalId || 'GLOBAL',
          ':q': searchQuery,
          ':active': true,
        },
      }),
    ),
  ];

  // Also search global medicines if hospital-specific
  if (hospitalId) {
    queries.push(
      ddb.send(
        new QueryCommand({
          TableName: TABLES.MEDICINES,
          IndexName: 'hospital-name-index',
          KeyConditionExpression: 'hospital_id = :hid',
          FilterExpression: '(contains(name_mr, :q) OR contains(name_en, :q)) AND is_active = :active',
          ExpressionAttributeValues: {
            ':hid': 'GLOBAL', // Search global medicines too
            ':q': searchQuery,
            ':active': true,
          },
        }),
      ),
    );
  }

  const results = await Promise.all(queries);
  const allItems = results.flatMap((r) => r.Items || []);
  
  // Deduplicate by medicine_id
  const unique = new Map();
  allItems.forEach((item) => {
    if (!unique.has(item.medicine_id)) {
      unique.set(item.medicine_id, item);
    }
  });
  
  return Array.from(unique.values());
};

const updateMedicineStatus = async (medicineId, isActive) => {
  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLES.MEDICINES,
      Key: { medicine_id: medicineId },
      UpdateExpression: 'SET is_active = :active',
      ExpressionAttributeValues: {
        ':active': isActive,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return res.Attributes || null;
};

module.exports = {
  createMedicine,
  getMedicineById,
  listMedicinesByType,
  listAllMedicines,
  searchMedicines,
  updateMedicineStatus,
};
