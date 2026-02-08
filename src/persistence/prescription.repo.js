const { v4: uuidv4 } = require('uuid');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createPrescriptionTemplate = async (template) => {
  const now = new Date().toISOString();
  const item = {
    template_id: template.template_id || uuidv4(),
    hospital_id: template.hospital_id,
    disease_id: template.disease_id || null,
    treatment_id: template.treatment_id || null,
    medicines: template.medicines || [],
    instructions_mr: template.instructions_mr || '',
    instructions_en: template.instructions_en || template.instructions_mr || '',
    created_by: template.created_by,
    created_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLES.PRESCRIPTION_TEMPLATES,
      Item: item,
      ConditionExpression: 'attribute_not_exists(template_id)',
    }),
  );

  return item;
};

const getPrescriptionTemplateById = async (templateId) => {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLES.PRESCRIPTION_TEMPLATES,
      Key: { template_id: templateId },
    }),
  );
  return res.Item || null;
};

const listPrescriptionTemplates = async (hospitalId, filters = {}) => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.PRESCRIPTION_TEMPLATES,
      IndexName: 'hospital-templates-index',
      KeyConditionExpression: 'hospital_id = :hid',
      ExpressionAttributeValues: {
        ':hid': hospitalId,
      },
    }),
  );

  let items = res.Items || [];

  // Apply filters
  if (filters.disease_id) {
    items = items.filter((item) => item.disease_id === filters.disease_id);
  }
  if (filters.created_by) {
    items = items.filter((item) => item.created_by === filters.created_by);
  }

  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

module.exports = {
  createPrescriptionTemplate,
  getPrescriptionTemplateById,
  listPrescriptionTemplates,
};
