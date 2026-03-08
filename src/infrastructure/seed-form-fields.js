/**
 * Seed script: Populate default form fields for RECEPTION form.
 * Run once after deploying the FormFieldsTable.
 *
 * Usage:
 *   node src/infrastructure/seed-form-fields.js
 *
 * This creates:
 *   - 17 GLOBAL fields (visible to ALL hospitals)
 *   - Ayurvedic-specific GLOBAL fields (hospital_type: AYURVEDIC)
 *   - Allopathy-specific GLOBAL fields (hospital_type: ALLOPATHY)
 */
require('dotenv').config();

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.FORM_FIELDS_TABLE || 'ayurmedi-backend-form-fields-dev';
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const db = DynamoDBDocumentClient.from(client);

const now = new Date().toISOString();

const makeField = (overrides) => ({
  field_id: uuidv4(),
  hospital_id: 'GLOBAL',
  form_type: 'RECEPTION',
  is_active: true,
  is_required: false,
  hospital_type: 'ALL',
  created_at: now,
  updated_at: now,
  ...overrides,
});

// ─────────────────────────────────────────────
// SECTION DEFINITIONS
// ─────────────────────────────────────────────
const SECTIONS = {
  registration: { section: 'registration', section_label_en: 'Registration Info', section_label_mr: 'नोंदणी माहिती', section_sort_order: 1 },
  personal: { section: 'personal', section_label_en: 'Personal Information', section_label_mr: 'वैयक्तिक माहिती', section_sort_order: 2 },
  contact: { section: 'contact', section_label_en: 'Contact Details', section_label_mr: 'संपर्क माहिती', section_sort_order: 3 },
  family: { section: 'family', section_label_en: 'Family & Occupation', section_label_mr: 'कुटुंब व व्यवसाय', section_sort_order: 4 },
  medical: { section: 'medical', section_label_en: 'Medical Information', section_label_mr: 'वैद्यकीय माहिती', section_sort_order: 5 },
};

// ─────────────────────────────────────────────
// COMMON FIELDS (ALL hospital types)
// ─────────────────────────────────────────────
const COMMON_FIELDS = [
  makeField({
    ...SECTIONS.registration,
    field_key: 'serial_no', label_en: 'Serial No', label_mr: 'क्रमांक',
    input_type: 'computed', sort_order: 1,
  }),
  makeField({
    ...SECTIONS.registration,
    field_key: 'visit_date', label_en: 'Date', label_mr: 'दिनांक',
    input_type: 'date', is_required: true, sort_order: 2,
    default_value: 'TODAY',
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'patient_name', label_en: 'Full Name', label_mr: 'नांव',
    input_type: 'text', is_required: true, sort_order: 3,
    placeholder_en: 'Patient full name', placeholder_mr: 'रुग्णाचे पूर्ण नाव',
    validation: { maxLength: 100 },
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'age', label_en: 'Age (years)', label_mr: 'वय',
    input_type: 'number', sort_order: 4,
    validation: { min: 0, max: 150 },
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'gender', label_en: 'Gender', label_mr: 'लिंग',
    input_type: 'select', is_required: true, sort_order: 5,
    options: [
      { value: 'male', label_en: 'Male', label_mr: 'पुरुष' },
      { value: 'female', label_en: 'Female', label_mr: 'स्त्री' },
      { value: 'other', label_en: 'Other', label_mr: 'इतर' },
    ],
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'dob', label_en: 'Date of Birth', label_mr: 'जन्मतारिख',
    input_type: 'date', sort_order: 6,
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'dob_time', label_en: 'Time of Birth', label_mr: 'जन्मवेळ',
    input_type: 'time', sort_order: 7,
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'birth_place', label_en: 'Birth Place', label_mr: 'जन्मस्थान',
    input_type: 'text', sort_order: 8,
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'education', label_en: 'Education', label_mr: 'शिक्षण',
    input_type: 'text', sort_order: 9,
  }),
  makeField({
    ...SECTIONS.personal,
    field_key: 'weight', label_en: 'Weight (kg)', label_mr: 'वजन (किलो)',
    input_type: 'number', sort_order: 10,
    validation: { min: 0, max: 500 },
  }),
  makeField({
    ...SECTIONS.contact,
    field_key: 'address', label_en: 'Address', label_mr: 'पत्ता',
    input_type: 'textarea', sort_order: 11,
    placeholder_en: 'Full address', placeholder_mr: 'पूर्ण पत्ता',
  }),
  makeField({
    ...SECTIONS.contact,
    field_key: 'mobile', label_en: 'Mobile', label_mr: 'मोबाईल',
    input_type: 'phone', is_required: true, sort_order: 12,
    validation: { pattern: '^[0-9]{10}$', message: 'Enter 10-digit mobile number' },
  }),
  makeField({
    ...SECTIONS.contact,
    field_key: 'phone', label_en: 'Phone (Landline)', label_mr: 'फोन',
    input_type: 'phone', sort_order: 13,
  }),
  makeField({
    ...SECTIONS.contact,
    field_key: 'email', label_en: 'Email Address', label_mr: 'ईमेल',
    input_type: 'email', sort_order: 14,
    validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$', message: 'Enter valid email' },
  }),
  makeField({
    ...SECTIONS.family,
    field_key: 'occupation', label_en: 'Occupation', label_mr: 'व्यवसाय',
    input_type: 'text', sort_order: 15,
  }),
  makeField({
    ...SECTIONS.family,
    field_key: 'spouse_occupation', label_en: 'Spouse / Father Occupation', label_mr: 'पतीचा / वडिलांचा व्यवसाय',
    input_type: 'text', sort_order: 16,
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'current_illness', label_en: 'Current Complaints', label_mr: 'वर्तमानव्याधिवृत्त / सध्याच्या तक्रारी',
    input_type: 'textarea', sort_order: 17,
    placeholder_en: 'Describe current complaints in detail', placeholder_mr: 'सध्याच्या सर्व तक्रारी लिहा',
  }),
];

// ─────────────────────────────────────────────
// AYURVEDIC-SPECIFIC FIELDS
// ─────────────────────────────────────────────
const AYURVEDIC_FIELDS = [
  makeField({
    ...SECTIONS.medical,
    field_key: 'prakriti', label_en: 'Prakriti', label_mr: 'प्रकृती',
    input_type: 'select', sort_order: 18, hospital_type: 'AYURVEDIC',
    options: [
      { value: 'vata', label_en: 'Vata', label_mr: 'वात' },
      { value: 'pitta', label_en: 'Pitta', label_mr: 'पित्त' },
      { value: 'kapha', label_en: 'Kapha', label_mr: 'कफ' },
      { value: 'vata_pitta', label_en: 'Vata-Pitta', label_mr: 'वात-पित्त' },
      { value: 'vata_kapha', label_en: 'Vata-Kapha', label_mr: 'वात-कफ' },
      { value: 'pitta_kapha', label_en: 'Pitta-Kapha', label_mr: 'पित्त-कफ' },
      { value: 'tridosha', label_en: 'Tridosha (Sama)', label_mr: 'त्रिदोष (सम)' },
    ],
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'nadi_pariksha', label_en: 'Nadi Pariksha', label_mr: 'नाडी परीक्षा',
    input_type: 'text', sort_order: 19, hospital_type: 'AYURVEDIC',
    placeholder_en: 'Nadi type (Vata/Pitta/Kapha)', placeholder_mr: 'नाडी प्रकार',
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'purvarut', label_en: 'Previous Disease History', label_mr: 'पूर्वरुत (आधीचे आजार)',
    input_type: 'multi_select', sort_order: 20, hospital_type: 'AYURVEDIC',
    options_source: 'purvrut',
    placeholder_en: 'Select previous diseases', placeholder_mr: 'आधीचे आजार निवडा',
  }),
];

// ─────────────────────────────────────────────
// ALLOPATHY-SPECIFIC FIELDS
// ─────────────────────────────────────────────
const ALLOPATHY_FIELDS = [
  makeField({
    ...SECTIONS.medical,
    field_key: 'blood_group', label_en: 'Blood Group', label_mr: 'रक्तगट',
    input_type: 'select', sort_order: 18, hospital_type: 'ALLOPATHY',
    options: [
      { value: 'A+', label_en: 'A+', label_mr: 'A+' },
      { value: 'A-', label_en: 'A-', label_mr: 'A-' },
      { value: 'B+', label_en: 'B+', label_mr: 'B+' },
      { value: 'B-', label_en: 'B-', label_mr: 'B-' },
      { value: 'O+', label_en: 'O+', label_mr: 'O+' },
      { value: 'O-', label_en: 'O-', label_mr: 'O-' },
      { value: 'AB+', label_en: 'AB+', label_mr: 'AB+' },
      { value: 'AB-', label_en: 'AB-', label_mr: 'AB-' },
    ],
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'blood_pressure', label_en: 'Blood Pressure', label_mr: 'रक्तदाब',
    input_type: 'text', sort_order: 19, hospital_type: 'ALLOPATHY',
    placeholder_en: 'e.g. 120/80 mmHg', placeholder_mr: 'उदा. 120/80 mmHg',
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'sugar_level', label_en: 'Sugar Level', label_mr: 'साखर पातळी',
    input_type: 'text', sort_order: 20, hospital_type: 'ALLOPATHY',
    placeholder_en: 'Fasting / PP sugar in mg/dL', placeholder_mr: 'उपाशी / जेवणानंतर साखर',
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'known_allergies', label_en: 'Known Allergies', label_mr: 'ऍलर्जी (माहीत असलेल्या)',
    input_type: 'textarea', sort_order: 21, hospital_type: 'ALLOPATHY',
    placeholder_en: 'List known allergies (drug, food, environment)', placeholder_mr: 'ज्ञात ऍलर्जी लिहा',
  }),
  makeField({
    ...SECTIONS.medical,
    field_key: 'chronic_conditions', label_en: 'Chronic Conditions', label_mr: 'जुने आजार',
    input_type: 'multi_select', sort_order: 22, hospital_type: 'ALLOPATHY',
    options: [
      { value: 'diabetes', label_en: 'Diabetes', label_mr: 'मधुमेह' },
      { value: 'hypertension', label_en: 'Hypertension', label_mr: 'उच्च रक्तदाब' },
      { value: 'heart_disease', label_en: 'Heart Disease', label_mr: 'हृदयरोग' },
      { value: 'asthma', label_en: 'Asthma', label_mr: 'दमा' },
      { value: 'thyroid', label_en: 'Thyroid', label_mr: 'थायरॉईड' },
    ],
  }),
];

// ─────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────
const ALL_FIELDS = [...COMMON_FIELDS, ...AYURVEDIC_FIELDS, ...ALLOPATHY_FIELDS];

async function seedFields() {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║    SEEDING FORM FIELDS - ${ALL_FIELDS.length} total fields    ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  console.log(`Table: ${TABLE}`);

  let success = 0;
  let failed = 0;

  for (const field of ALL_FIELDS) {
    try {
      await db.send(new PutCommand({ TableName: TABLE, Item: field }));
      console.log(`  ✅ [${field.hospital_type}] ${field.field_key} (${field.label_en})`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${field.field_key}:`, err.message);
      failed++;
    }
  }

  console.log(`\n──────────────────────────────────────────────`);
  console.log(`  Seeded: ${success} fields`);
  console.log(`  Failed: ${failed} fields`);
  console.log(`\nBreakdown:`);
  console.log(`  • Common (ALL):    ${COMMON_FIELDS.length} fields`);
  console.log(`  • Ayurvedic only:  ${AYURVEDIC_FIELDS.length} fields`);
  console.log(`  • Allopathy only:  ${ALLOPATHY_FIELDS.length} fields`);
  console.log(`──────────────────────────────────────────────\n`);
}

seedFields().catch(console.error);
