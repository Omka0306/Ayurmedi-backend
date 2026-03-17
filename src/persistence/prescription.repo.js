const { v4: uuidv4 } = require('uuid');
const {
  PutCommand, GetCommand, QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('./dynamodb.client');
const { TABLES } = require('../constants/config');

const ddb = getDocumentClient();

const createPrescription = async (prescription) => {
  const now = new Date().toISOString();
  const item = {
    prescription_id:  prescription.prescription_id || uuidv4(),
    consultation_id:  prescription.consultation_id,
    patient_id:       prescription.patient_id,
    hospital_id:      prescription.hospital_id,
    doctor_id:        prescription.doctor_id,
    doctor_name:      prescription.doctor_name || null,
    prescription_date: prescription.prescription_date || now.split('T')[0],

    // A. Medicines
    medicines: prescription.medicines || [],
    // Each medicine: { name, form, dose_qty, frequency, timing, duration_days, special_instructions, item_id }

    // B. Treatments prescribed
    treatments: prescription.treatments || [],
    // Each treatment: { type, description, sessions, linked_panchakarma_plan_id }

    // C. Pathya-Apathya (diet)
    pathya:    prescription.pathya || [],    // foods to eat
    apathya:   prescription.apathya || [],   // foods to avoid
    diet_notes: prescription.diet_notes || null,

    // D. Lifestyle instructions
    exercise_instructions: prescription.exercise_instructions || null,
    yoga_pranayama:        prescription.yoga_pranayama || null,
    rest_recommendations:  prescription.rest_recommendations || null,
    prohibited_activities: prescription.prohibited_activities || null,

    // E. Precautions
    precautions: prescription.precautions || null,

    // F. Follow-up
    follow_up_date:    prescription.follow_up_date || null,
    treatment_duration: prescription.treatment_duration || null,
    follow_up_notes:   prescription.follow_up_notes || null,

    status:     prescription.status || 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  await ddb.send(new PutCommand({
    TableName: TABLES.PRESCRIPTIONS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(prescription_id)',
  }));

  return item;
};

const getPrescriptionById = async (prescriptionId) => {
  const res = await ddb.send(new GetCommand({
    TableName: TABLES.PRESCRIPTIONS,
    Key: { prescription_id: prescriptionId },
  }));
  return res.Item || null;
};

const listPrescriptionsByPatient = async (patientId, { limit = 20, lastKey } = {}) => {
  const params = {
    TableName: TABLES.PRESCRIPTIONS,
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

const listPrescriptionsByConsultation = async (consultationId) => {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.PRESCRIPTIONS,
    IndexName: 'consultation_id-index',
    KeyConditionExpression: 'consultation_id = :cid',
    ExpressionAttributeValues: { ':cid': consultationId },
    ScanIndexForward: false,
  }));
  return res.Items || [];
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  listPrescriptionsByPatient,
  listPrescriptionsByConsultation,
};
