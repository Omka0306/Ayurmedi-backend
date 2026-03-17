const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand, UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES, BILL_STATUS } = require('../constants/config');

const ddb = getDocumentClient();

const createBill = async (bill) => {
  const now = new Date().toISOString();
  const item = {
    bill_id:         bill.bill_id || uuidv4(),
    patient_id:      bill.patient_id,
    patient_name:    bill.patient_name || null,
    hospital_id:     bill.hospital_id,
    branch_id:       bill.branch_id || null,
    doctor_id:       bill.doctor_id || null,
    consultation_id: bill.consultation_id || null,
    bill_date:       bill.bill_date || now.split('T')[0],

    // Line items
    items: bill.items || [],
    // Each item: { description, type (CONSULTATION/MEDICINE/PANCHAKARMA/THERAPY/OTHER), qty, unit_price, amount }

    // Financials
    subtotal:         bill.subtotal || 0,
    discount_type:    bill.discount_type || null,   // 'PERCENT' | 'FIXED'
    discount_value:   bill.discount_value || 0,
    discount_amount:  bill.discount_amount || 0,
    tax_percent:      bill.tax_percent || 0,
    tax_amount:       bill.tax_amount || 0,
    total_amount:     bill.total_amount || 0,
    amount_paid:      bill.amount_paid || 0,
    balance_due:      bill.balance_due || bill.total_amount || 0,

    // Payments
    payments: bill.payments || [],
    // Each: { payment_id, amount, mode, date, reference_no, notes }

    status:     bill.status || BILL_STATUS.PENDING,
    notes:      bill.notes || null,
    created_at: now,
    updated_at: now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.BILLS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(bill_id)',
  }));

  return item;
};

const getBillById = async (billId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.BILLS,
    Key: { bill_id: billId },
  }));
  return res.Item || null;
};

const listBillsByPatient = async (patientId, { limit = 20, lastKey } = {}) => {
  const params = {
    TableName: TABLES.BILLS,
    IndexName: 'patient_id-index',
    KeyConditionExpression: 'patient_id = :pid',
    ExpressionAttributeValues: { ':pid': patientId },
    ScanIndexForward: false,
    Limit: limit,
  };
  if (lastKey) params.ExclusiveStartKey = lastKey;
  const res = await ddb.send(new QueryCommand(params));
  return { items: res.Items || [], lastKey: res.LastEvaluatedKey || null };
};

const listBillsByHospitalAndDateRange = async (hospitalId, fromDate, toDate, { limit = 200 } = {}) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.BILLS,
    IndexName: 'hospital_id-date-index',
    KeyConditionExpression: 'hospital_id = :hid AND bill_date BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':hid': hospitalId,
      ':from': fromDate,
      ':to': toDate,
    },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return res.Items || [];
};

const updateBill = async (billId, updates) => {
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
    TableName: TABLES.BILLS,
    Key: { bill_id: billId },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: 'attribute_exists(bill_id)',
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
};

module.exports = {
  createBill,
  getBillById,
  listBillsByPatient,
  listBillsByHospitalAndDateRange,
  updateBill,
};
