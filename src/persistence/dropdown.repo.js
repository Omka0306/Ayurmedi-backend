const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

// Dropdown Categories
const createDropdownCategory = async (category) => {
  const now = new Date().toISOString();
  const item = {
    dropdown_id: category.dropdown_id || uuidv4(),
    dropdown_code: category.dropdown_code,
    label_mr: category.label_mr,
    label_en: category.label_en || category.label_mr,
    section_name: category.section_name,
    input_type: category.input_type || 'select',
    hospital_id: category.hospital_id || null,
    is_active: category.is_active !== undefined ? category.is_active : true,
    sort_order: category.sort_order || 0,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.DROPDOWN_CATEGORIES,
      Item: item,
      ConditionExpression: 'attribute_not_exists(dropdown_id)',
    }),
  );

  return item;
};

const getDropdownByCode = async (dropdownCode, hospitalId = null) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.DROPDOWN_CATEGORIES,
      IndexName: 'dropdown-code-index',
      KeyConditionExpression: 'dropdown_code = :code',
      FilterExpression: 'is_active = :active',
      ExpressionAttributeValues: {
        ':code': dropdownCode,
        ':active': true,
      },
    }),
  );

  // Prefer hospital-specific, fallback to global (hospital_id = null)
  const items = res.Items || [];
  const hospitalSpecific = items.find((item) => item.hospital_id === hospitalId);
  const global = items.find((item) => item.hospital_id === null);
  
  return hospitalSpecific || global || null;
};

const listAllDropdowns = async (hospitalId = null) => {
  // Get both hospital-specific and global dropdowns
  const queries = [
    ddb.send(
      new QueryCommand({
        TableName: TABLES.DROPDOWN_CATEGORIES,
        IndexName: 'hospital-dropdown-index',
        KeyConditionExpression: 'hospital_id = :hid',
        FilterExpression: 'is_active = :active',
        ExpressionAttributeValues: {
          ':hid': hospitalId || 'GLOBAL',
          ':active': true,
        },
      }),
    ),
  ];

  if (hospitalId) {
    queries.push(
      ddb.send(
        new QueryCommand({
          TableName: TABLES.DROPDOWN_CATEGORIES,
          IndexName: 'hospital-dropdown-index',
          KeyConditionExpression: 'hospital_id = :hid',
          FilterExpression: 'is_active = :active',
          ExpressionAttributeValues: {
            ':hid': 'GLOBAL', // Get global dropdowns too
            ':active': true,
          },
        }),
      ),
    );
  }

  const results = await Promise.all(queries);
  const allItems = results.flatMap((r) => r.Items || []);
  
  // Deduplicate by dropdown_code, prefer hospital-specific
  const unique = new Map();
  allItems.forEach((item) => {
    const key = item.dropdown_code;
    if (!unique.has(key) || item.hospital_id === hospitalId) {
      unique.set(key, item);
    }
  });
  
  return Array.from(unique.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

// Dropdown Options
const createDropdownOption = async (option) => {
  const now = new Date().toISOString();
  const item = {
    option_id: option.option_id || uuidv4(),
    dropdown_id: option.dropdown_id,
    value_code: option.value_code,
    label_mr: option.label_mr,
    label_en: option.label_en || option.label_mr,
    hospital_id: option.hospital_id || null,
    is_active: option.is_active !== undefined ? option.is_active : true,
    sort_order: option.sort_order || 0,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.DROPDOWN_OPTIONS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(option_id)',
    }),
  );

  return item;
};

const getOptionsByDropdownId = async (dropdownId, hospitalId = null) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.DROPDOWN_OPTIONS,
      IndexName: 'dropdown-options-index',
      KeyConditionExpression: 'dropdown_id = :did',
      FilterExpression: 'is_active = :active',
      ExpressionAttributeValues: {
        ':did': dropdownId,
        ':active': true,
      },
    }),
  );

  // Prefer hospital-specific, include global
  const items = res.Items || [];
  const hospitalSpecific = items.filter((item) => item.hospital_id === hospitalId);
  const global = items.filter((item) => item.hospital_id === null);
  
  // Deduplicate by value_code, prefer hospital-specific
  const unique = new Map();
  [...global, ...hospitalSpecific].forEach((item) => {
    const key = item.value_code;
    if (!unique.has(key) || item.hospital_id === hospitalId) {
      unique.set(key, item);
    }
  });
  
  return Array.from(unique.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

module.exports = {
  createDropdownCategory,
  getDropdownByCode,
  listAllDropdowns,
  createDropdownOption,
  getOptionsByDropdownId,
};
