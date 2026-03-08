const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { TABLES } = require('../constants/config');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const db = DynamoDBDocumentClient.from(client);

const TABLE = TABLES.FORM_FIELDS;

/**
 * Get form schema for a specific hospital + form_type.
 * Returns GLOBAL defaults merged with any hospital-specific overrides.
 * Hospital-specific field wins on field_key conflict.
 */
const getFormSchema = async (hospital_id, form_type) => {
  // 1. Fetch GLOBAL defaults
  const globalRes = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'hospital-form-index',
    KeyConditionExpression: 'hospital_id = :hid AND form_type = :ft',
    FilterExpression: 'is_active = :active',
    ExpressionAttributeValues: {
      ':hid': 'GLOBAL',
      ':ft': form_type,
      ':active': true,
    },
  }));

  // 2. Fetch hospital-specific overrides
  const hospitalRes = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'hospital-form-index',
    KeyConditionExpression: 'hospital_id = :hid AND form_type = :ft',
    FilterExpression: 'is_active = :active',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':ft': form_type,
      ':active': true,
    },
  }));

  // 3. Merge: hospital-specific overrides GLOBAL on same field_key
  const globalFields = globalRes.Items || [];
  const hospitalFields = hospitalRes.Items || [];

  const hospitalMap = {};
  hospitalFields.forEach((f) => { hospitalMap[f.field_key] = f; });

  // Replace global field if hospital has override for same field_key
  const merged = globalFields.map((f) =>
    hospitalMap[f.field_key] ? { ...f, ...hospitalMap[f.field_key] } : f
  );

  // Append purely hospital-specific fields (new keys not in GLOBAL)
  const globalKeys = new Set(globalFields.map((f) => f.field_key));
  hospitalFields.forEach((f) => {
    if (!globalKeys.has(f.field_key)) merged.push(f);
  });

  return merged.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

/**
 * Upsert a form field for a hospital.
 * If field_key + hospital_id + form_type already exists, update it.
 * Otherwise create new.
 */
const upsertFormField = async (data) => {
  const { hospital_id, form_type, field_key } = data;

  // Check if it already exists for this hospital + form_type + field_key
  const existing = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'hospital-form-index',
    KeyConditionExpression: 'hospital_id = :hid AND form_type = :ft',
    FilterExpression: 'field_key = :fk',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':ft': form_type,
      ':fk': field_key,
    },
  }));

  const now = new Date().toISOString();

  if (existing.Items && existing.Items.length > 0) {
    // Update existing
    const existingField = existing.Items[0];
    const updateData = {
      ...data,
      field_id: existingField.field_id,
      updated_at: now,
    };
    await db.send(new PutCommand({ TableName: TABLE, Item: updateData }));
    return updateData;
  }

  // Create new
  const field = {
    ...data,
    field_id: uuidv4(),
    is_active: data.is_active !== undefined ? data.is_active : true,
    created_at: now,
    updated_at: now,
  };

  await db.send(new PutCommand({ TableName: TABLE, Item: field }));
  return field;
};

/**
 * Toggle a field's is_active status for a specific hospital.
 * Only allows toggling fields belonging to this hospital (not GLOBAL).
 */
const toggleFormField = async (field_id, hospital_id) => {
  // Get existing field
  const res = await db.send(new GetCommand({ TableName: TABLE, Key: { field_id } }));
  const field = res.Item;

  if (!field) return null;
  if (field.hospital_id !== hospital_id) return null; // Can't toggle GLOBAL from hospital

  const newStatus = !field.is_active;

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { field_id },
    UpdateExpression: 'SET is_active = :status, updated_at = :ua',
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':ua': new Date().toISOString(),
    },
  }));

  return { ...field, is_active: newStatus };
};

/**
 * Get a single field by ID
 */
const getFieldById = async (field_id) => {
  const res = await db.send(new GetCommand({ TableName: TABLE, Key: { field_id } }));
  return res.Item || null;
};

/**
 * List all form fields for a hospital + form_type (for admin management UI)
 */
const listFieldsByHospital = async (hospital_id, form_type) => {
  const params = {
    TableName: TABLE,
    IndexName: 'hospital-form-index',
    KeyConditionExpression: 'hospital_id = :hid AND form_type = :ft',
    ExpressionAttributeValues: {
      ':hid': hospital_id,
      ':ft': form_type,
    },
  };
  const res = await db.send(new QueryCommand(params));
  return (res.Items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
};

module.exports = {
  getFormSchema,
  upsertFormField,
  toggleFormField,
  getFieldById,
  listFieldsByHospital,
};
