/**
 * Seed Ayurvedic Patient History (Case Paper) Form Fields
 *
 * Based on the physical Ayurvedic case paper (3 pages) consisting of:
 * - Chief Complaint section
 * - Current medicines
 * - Previous history (disease multi-select)
 * - Daily routine & Diet (detailed food table)
 * - Bowel/Urination/Perspiration habits
 * - Menstrual history (female)
 * - Mental status, Sleep, Addictions
 *
 * Usage:
 *   node src/infrastructure/seed-history-form-fields.js
 *
 * This seeds:
 *   1. GLOBAL Ayurvedic HISTORY fields (hospital_type=AYURVEDIC)
 *   2. Hospital-specific overrides for hospital 08c9e335-1a00-4db3-930f-9-bbdc800eb55a
 */
require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const FORM_FIELDS_TABLE = process.env.FORM_FIELDS_TABLE || 'ayurmedi-backend-form-fields-dev';
const HOSPITALS_TABLE = process.env.HOSPITALS_TABLE || 'ayurmedi-backend-hospitals-dev';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const db = DynamoDBDocumentClient.from(client);

// ─── Target Hospital (fetched from DB) ─────────────────────────────────────
const TARGET_HOSPITAL_ID = '08c9e335-1a00-4db3-930f-9-bbdc800eb55a';
const TARGET_HOSPITAL_NAME = 'test5Hospital';

const now = new Date().toISOString();

const makeField = (hospital_id, overrides) => ({
  field_id: uuidv4(),
  hospital_id,
  form_type: 'HISTORY',
  is_active: true,
  is_required: false,
  hospital_type: 'AYURVEDIC',
  created_at: now,
  updated_at: now,
  ...overrides,
});

// ─── Section Definitions ───────────────────────────────────────────────────
const SECTIONS = {
  chief_complaint: {
    section: 'chief_complaint',
    section_label_en: 'Chief Complaint',
    section_label_mr: 'प्रधान वेदना / मुख्य तक्रार',
    section_sort_order: 1,
  },
  current_medicines: {
    section: 'current_medicines',
    section_label_en: 'Current Medicines',
    section_label_mr: 'सध्याची औषधे',
    section_sort_order: 2,
  },
  previous_history: {
    section: 'previous_history',
    section_label_en: 'Previous Disease History (पूर्वरुत)',
    section_label_mr: 'पूर्वरुत (वयोनुक्रमाने पूर्वीचे आजार)',
    section_sort_order: 3,
  },
  family_history: {
    section: 'family_history',
    section_label_en: 'Family History',
    section_label_mr: 'कुटुंबाचे आजार / वंशपरंपरा',
    section_sort_order: 4,
  },
  daily_routine: {
    section: 'daily_routine',
    section_label_en: 'Daily Routine (दिनचर्या)',
    section_label_mr: 'दिनचर्या',
    section_sort_order: 5,
  },
  diet: {
    section: 'diet',
    section_label_en: 'Diet (आहार)',
    section_label_mr: 'आहार',
    section_sort_order: 6,
  },
  bowel: {
    section: 'bowel',
    section_label_en: 'Bowel Habits (मलप्रवृत्ती)',
    section_label_mr: 'मलप्रवृत्ती',
    section_sort_order: 7,
  },
  urine: {
    section: 'urine',
    section_label_en: 'Urination (मूत्रप्रवृत्ती)',
    section_label_mr: 'मूत्रप्रवृत्ती',
    section_sort_order: 8,
  },
  sweat: {
    section: 'sweat',
    section_label_en: 'Perspiration (स्वेदप्रवृत्ती)',
    section_label_mr: 'स्वेदप्रवृत्ती',
    section_sort_order: 9,
  },
  menstrual: {
    section: 'menstrual',
    section_label_en: 'Menstrual History (राजःप्रवृत्ती)',
    section_label_mr: 'राजःप्रवृत्ती (स्त्रियांसाठी)',
    section_sort_order: 10,
  },
  mental: {
    section: 'mental',
    section_label_en: 'Mental Status (मानसिक स्थिती)',
    section_label_mr: 'मानसिक स्थिती',
    section_sort_order: 11,
  },
  sleep: {
    section: 'sleep',
    section_label_en: 'Sleep (निद्रा)',
    section_label_mr: 'निद्रा',
    section_sort_order: 12,
  },
  addictions: {
    section: 'addictions',
    section_label_en: 'Addictions (नशासंबंधी)',
    section_label_mr: 'नशासंबंधी व्यसने',
    section_sort_order: 13,
  },
};

// ══════════════════════════════════════════════════════════════════
// GLOBAL AYURVEDIC HISTORY FIELDS
// ══════════════════════════════════════════════════════════════════
const GLOBAL_HISTORY_FIELDS = [

  // ── SECTION 1: Chief Complaint ─────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.chief_complaint,
    field_key: 'chief_complaint', label_en: 'Chief Complaint', label_mr: 'प्रधान वेदना',
    input_type: 'textarea', is_required: true, sort_order: 1,
    placeholder_en: 'Describe the main complaint', placeholder_mr: 'मुख्य तक्रार लिहा',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.chief_complaint,
    field_key: 'complaint_duration', label_en: 'Duration', label_mr: 'कालावधी',
    input_type: 'text', sort_order: 2,
    placeholder_en: 'e.g. 3 days, 2 months', placeholder_mr: 'उदा. ३ दिवस, २ महिने',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.chief_complaint,
    field_key: 'upashay', label_en: 'Relief Factors (Upashay)', label_mr: 'उपशय (कशाने बरे वाटते)',
    input_type: 'textarea', sort_order: 3,
    placeholder_en: 'What provides relief?', placeholder_mr: 'कशाने आराम मिळतो',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.chief_complaint,
    field_key: 'anupashay', label_en: 'Aggravating Factors (Anupashay)', label_mr: 'अनुपशय (कशाने त्रास वाढतो)',
    input_type: 'textarea', sort_order: 4,
    placeholder_en: 'What aggravates the condition?', placeholder_mr: 'कशाने त्रास वाढतो',
  }),

  // ── SECTION 2: Current Medicines ──────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.current_medicines,
    field_key: 'current_medicine_1', label_en: 'Current Medicine 1', label_mr: 'सध्याची औषधे १',
    input_type: 'text', sort_order: 10,
    placeholder_en: 'Medicine name & dose', placeholder_mr: 'औषधाचे नाव व मात्रा',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.current_medicines,
    field_key: 'current_medicine_2', label_en: 'Current Medicine 2', label_mr: 'सध्याची औषधे २',
    input_type: 'text', sort_order: 11,
  }),
  makeField('GLOBAL', {
    ...SECTIONS.current_medicines,
    field_key: 'current_medicine_3', label_en: 'Current Medicine 3', label_mr: 'सध्याची औषधे ३',
    input_type: 'text', sort_order: 12,
  }),

  // ── SECTION 3: Previous Disease History ───────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.previous_history,
    field_key: 'purvarut_diseases', label_en: 'Previous Diseases', label_mr: 'पूर्वीचे आजार',
    input_type: 'multi_select', sort_order: 20,
    options: [
      { value: 'govar', label_en: 'Measles (Govar)', label_mr: 'गोवर' },
      { value: 'kanjanya', label_en: 'Chicken Pox (Kanjanya)', label_mr: 'कांजिण्या' },
      { value: 'devi', label_en: 'Small Pox (Devi)', label_mr: 'देवी' },
      { value: 'maleria', label_en: 'Malaria', label_mr: 'मलेरिया' },
      { value: 'typhoid', label_en: 'Typhoid', label_mr: 'टायफॉईड' },
      { value: 'kavil', label_en: 'Jaundice (Kavil)', label_mr: 'कावीळ' },
      { value: 'aav', label_en: 'Dysentery (Aav)', label_mr: 'आव' },
      { value: 'jant', label_en: 'Worms (Jant)', label_mr: 'जंत' },
      { value: 'dole_yene', label_en: 'Eye Infection', label_mr: 'डोळे येणे' },
      { value: 'kaan_futne', label_en: 'Ear Discharge', label_mr: 'कान फुटणे' },
      { value: 'nagin', label_en: 'Herpes (Nagin)', label_mr: 'नागीण' },
      { value: 'galgund', label_en: 'Mumps (Galgund)', label_mr: 'गालगुंड' },
      { value: 'nyumonia', label_en: 'Pneumonia', label_mr: 'न्यूमोनिया' },
      { value: 'asthibhagn', label_en: 'Fracture (Asthibhagn)', label_mr: 'अस्थिभग्न' },
      { value: 'tvacharog', label_en: 'Skin Disease (Tvacharog)', label_mr: 'त्वचारोग' },
      { value: 'gastro', label_en: 'Gastroenteritis', label_mr: 'गॅस्ट्रो' },
      { value: 'hrudroga', label_en: 'Heart Disease', label_mr: 'हृदरोग' },
      { value: 'ashmari', label_en: 'Kidney Stone (Ashmari)', label_mr: 'अश्मरी' },
      { value: 'sheetapitta', label_en: 'Urticaria (Sheetapitta)', label_mr: 'शीतपित्त' },
      { value: 'garbhashay_op', label_en: 'Uterus Operation', label_mr: 'गर्भाशय शस्त्रक्रिया' },
      { value: 'appendix_op', label_en: 'Appendix Operation', label_mr: 'गिलायू/उण्डूकपुच्छ निर्हरण' },
      { value: 'apaghat', label_en: 'Accident', label_mr: 'अपघात' },
      { value: 'chikungunya', label_en: 'Chikungunya', label_mr: 'चिकन गुनिया' },
      { value: 'dengue', label_en: 'Dengue', label_mr: 'डेंग्यू' },
      { value: 'corona', label_en: 'Corona / COVID-19', label_mr: 'कोरोना' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.previous_history,
    field_key: 'mrutikabhakshan', label_en: 'Pica (Eating soil/chalk/pencil)', label_mr: 'मृतिकाभक्षण (माती/खडू/पेन्सिल खाणे)',
    input_type: 'select', sort_order: 22,
    options: [
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
      { value: 'soil', label_en: 'Soil (माती)', label_mr: 'माती' },
      { value: 'chalk', label_en: 'Chalk (खडू)', label_mr: 'खडू' },
      { value: 'pencil', label_en: 'Pencil lead', label_mr: 'पेन्सिल' },
    ],
    default_value: 'no',
  }),

  // ── SECTION 4: Family History ──────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.family_history,
    field_key: 'family_diseases', label_en: 'Family Diseases', label_mr: 'कुटुंबाचे आजार',
    input_type: 'multi_select', sort_order: 30,
    options: [
      { value: 'bp', label_en: 'Blood Pressure', label_mr: 'रक्तदाब' },
      { value: 'diabetes', label_en: 'Diabetes', label_mr: 'मधुमेह' },
      { value: 'svitra', label_en: 'Vitiligo (Svitra)', label_mr: 'श्वित्र' },
      { value: 'unchi_kami', label_en: 'Short Height', label_mr: 'उंची कमी' },
      { value: 'shvas', label_en: 'Asthma (Shvas)', label_mr: 'श्वास' },
      { value: 'isab', label_en: 'Eczema (Isab)', label_mr: 'इसब' },
      { value: 'chhapra', label_en: 'Urticaria (Chhapra)', label_mr: 'छप्पा' },
      { value: 'hrudroga', label_en: 'Heart Disease', label_mr: 'हृदरोग' },
      { value: 'cancer', label_en: 'Cancer', label_mr: 'कॅन्सर' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.family_history,
    field_key: 'self_kul', label_en: 'Own Children (Self Lineage)', label_mr: 'स्वकुल (मुले/मुली)',
    input_type: 'text', sort_order: 31,
    placeholder_en: 'No. of sons/daughters', placeholder_mr: 'मुले/मुलींची संख्या',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.family_history,
    field_key: 'paternal_history', label_en: 'Paternal Lineage Diseases', label_mr: 'पितृकुल (वडील, काका, आत्या, आजी, आजोबा)',
    input_type: 'textarea', sort_order: 32,
    placeholder_en: 'Diseases in father, uncle, paternal grandparents...', placeholder_mr: 'वडील, काका, आत्या, आजी, आजोबा यांचे आजार',
  }),
  makeField('GLOBAL', {
    ...SECTIONS.family_history,
    field_key: 'maternal_history', label_en: 'Maternal Lineage Diseases', label_mr: 'मातृकुल (आई, मावशी, आजी, आजोबा)',
    input_type: 'textarea', sort_order: 33,
    placeholder_en: 'Diseases in mother, aunt, maternal grandparents...', placeholder_mr: 'आई, मावशी, आजी, आजोबा यांचे आजार',
  }),

  // ── SECTION 5: Daily Routine ───────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'wake_up_time', label_en: 'Wake Up Time', label_mr: 'उठण्याची वेळ',
    input_type: 'time', sort_order: 40,
  }),
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'sleep_time', label_en: 'Sleep Time', label_mr: 'झोपण्याची वेळ',
    input_type: 'time', sort_order: 41,
  }),
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'occupation_type', label_en: 'Occupation Type', label_mr: 'कामाचे स्वरूप',
    input_type: 'select', sort_order: 42,
    options: [
      { value: 'sedentary', label_en: 'Sedentary (बैठे काम)', label_mr: 'बैठे काम' },
      { value: 'moderate', label_en: 'Moderate Activity', label_mr: 'मध्यम काम' },
      { value: 'heavy', label_en: 'Heavy Labour', label_mr: 'जड शारीरिक काम' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'daily_exercise', label_en: 'Daily Exercise', label_mr: 'व्यायाम',
    input_type: 'select', sort_order: 43,
    options: [
      { value: 'none', label_en: 'None', label_mr: 'नाही' },
      { value: 'walk', label_en: 'Walking', label_mr: 'चालणे' },
      { value: 'yoga', label_en: 'Yoga', label_mr: 'योगा' },
      { value: 'gym', label_en: 'Gym', label_mr: 'जिम' },
      { value: 'other', label_en: 'Other', label_mr: 'इतर' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'water_intake', label_en: 'Daily Water Intake', label_mr: 'पाणी - दररोज',
    input_type: 'select', sort_order: 44,
    options: [
      { value: 'less_1l', label_en: 'Less than 1 litre', label_mr: '१ लिटरपेक्षा कमी' },
      { value: '1_2l', label_en: '1 - 2 litres', label_mr: '१ ते २ लिटर' },
      { value: 'more_2l', label_en: 'More than 2 litres', label_mr: '२ लिटरपेक्षा जास्त' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.daily_routine,
    field_key: 'water_type', label_en: 'Water Type Used', label_mr: 'पाण्याचा प्रकार',
    input_type: 'select', sort_order: 45,
    options: [
      { value: 'boiled', label_en: 'Boiled (तामण)', label_mr: 'तामण (उकळलेले)' },
      { value: 'tap', label_en: 'Tap', label_mr: 'नळाचे' },
      { value: 'tanker', label_en: 'Tanker', label_mr: 'टँकर' },
      { value: 'well', label_en: 'Well', label_mr: 'विहीर' },
      { value: 'packaged', label_en: 'Packaged / RO', label_mr: 'पॅकेज्ड / RO' },
    ],
  }),

  // ── SECTION 6: Diet ────────────────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'diet_type', label_en: 'Diet Type', label_mr: 'आहाराचे स्वरूप',
    input_type: 'select', is_required: true, sort_order: 50,
    options: [
      { value: 'veg', label_en: 'Vegetarian', label_mr: 'शाकाहारी' },
      { value: 'nonveg', label_en: 'Non-Vegetarian', label_mr: 'मांसाहारी' },
      { value: 'veg_egg', label_en: 'Vegetarian + Egg', label_mr: 'शाकाहारी + अंडे' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'meal_frequency', label_en: 'Meals Per Day', label_mr: 'जेवण किती वेळा',
    input_type: 'select', sort_order: 51,
    options: [
      { value: '1', label_en: 'Once', label_mr: 'एकदा' },
      { value: '2', label_en: 'Twice', label_mr: 'दोनदा' },
      { value: '3', label_en: 'Thrice', label_mr: 'तीनदा' },
      { value: 'more', label_en: 'More than 3', label_mr: '३ पेक्षा जास्त' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'vegetables_consumed', label_en: 'Vegetables (भाजी/पाला)', label_mr: 'भाजी / पाला / फळभाज्या',
    input_type: 'multi_select', sort_order: 52,
    options: [
      { value: 'leafy', label_en: 'Leafy Vegetables (पालेभाज्या)', label_mr: 'पालेभाज्या (मेथी, पालक, कोथिंबीर)' },
      { value: 'root', label_en: 'Root Vegetables (कंद)', label_mr: 'कंद (बटाटा, सुरण, रताळे)' },
      { value: 'gourds', label_en: 'Gourds (भोपळे)', label_mr: 'भोपळे, दोडका, कारले' },
      { value: 'beans', label_en: 'Beans / Drumstick', label_mr: 'शेंगा / शेवगा' },
      { value: 'brinjal', label_en: 'Brinjal, Tomato', label_mr: 'वांगे, टोमॅटो' },
      { value: 'cabbage', label_en: 'Cabbage (कोबी)', label_mr: 'कोबी / फ्लॉवर' },
      { value: 'onion_garlic', label_en: 'Onion / Garlic', label_mr: 'कांदा / लसूण' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'pulses_consumed', label_en: 'Pulses (डाळी)', label_mr: 'डाळी / कडधान्ये',
    input_type: 'multi_select', sort_order: 53,
    options: [
      { value: 'tur', label_en: 'Tur Dal', label_mr: 'तूर डाळ' },
      { value: 'moong', label_en: 'Moong Dal', label_mr: 'मूग डाळ' },
      { value: 'masoor', label_en: 'Masoor Dal', label_mr: 'मसूर डाळ' },
      { value: 'chana', label_en: 'Chana Dal / Besan', label_mr: 'हरभरा / बेसन' },
      { value: 'urid', label_en: 'Urid Dal', label_mr: 'उडीद डाळ' },
      { value: 'rajma', label_en: 'Rajma / Chavli', label_mr: 'राजमा / चवळी' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'grains_consumed', label_en: 'Grains (धान्य)', label_mr: 'धान्य / तृणधान्य',
    input_type: 'multi_select', sort_order: 54,
    options: [
      { value: 'rice', label_en: 'Rice', label_mr: 'तांदूळ / भात' },
      { value: 'wheat', label_en: 'Wheat (गहू)', label_mr: 'गहू / चपाती' },
      { value: 'jowar', label_en: 'Jowar (ज्वारी)', label_mr: 'ज्वारी' },
      { value: 'bajra', label_en: 'Bajra (बाजरी)', label_mr: 'बाजरी' },
      { value: 'nachni', label_en: 'Ragi/Nachni (नाचणी)', label_mr: 'नाचणी' },
      { value: 'corn', label_en: 'Corn (मका)', label_mr: 'मका' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'dairy_consumed', label_en: 'Milk & Dairy (दुग्धजन्य)', label_mr: 'दूध / दुग्धजन्य पदार्थ',
    input_type: 'multi_select', sort_order: 55,
    options: [
      { value: 'milk', label_en: 'Milk (दूध)', label_mr: 'दूध' },
      { value: 'curd', label_en: 'Curd (दही)', label_mr: 'दही' },
      { value: 'buttermilk', label_en: 'Buttermilk (ताक)', label_mr: 'ताक' },
      { value: 'ghee', label_en: 'Ghee (तूप)', label_mr: 'तूप' },
      { value: 'butter', label_en: 'Butter (लोणी)', label_mr: 'लोणी' },
      { value: 'paneer', label_en: 'Paneer', label_mr: 'पनीर' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'sweets_consumed', label_en: 'Sweets & Sugar', label_mr: 'गोड पदार्थ / साखर',
    input_type: 'select', sort_order: 56,
    options: [
      { value: 'no', label_en: 'Rarely / Never', label_mr: 'क्वचित / नाही' },
      { value: 'moderate', label_en: 'Moderate', label_mr: 'मध्यम' },
      { value: 'high', label_en: 'High (नेहमी)', label_mr: 'जास्त (नेहमी)' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'nonveg_type', label_en: 'Non-Veg Consumed (if any)', label_mr: 'मांसाहार (खात असल्यास)',
    input_type: 'multi_select', sort_order: 57,
    options: [
      { value: 'none', label_en: 'None', label_mr: 'नाही' },
      { value: 'chicken', label_en: 'Chicken', label_mr: 'चिकन' },
      { value: 'mutton', label_en: 'Mutton', label_mr: 'मटण' },
      { value: 'fish', label_en: 'Fish (मासे)', label_mr: 'मासे' },
      { value: 'egg', label_en: 'Egg (अंडे)', label_mr: 'अंडे' },
      { value: 'other', label_en: 'Other', label_mr: 'इतर' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'beverages', label_en: 'Beverages (पेये)', label_mr: 'चहा / कॉफी / इतर पेये',
    input_type: 'multi_select', sort_order: 58,
    options: [
      { value: 'tea', label_en: 'Tea (चहा)', label_mr: 'चहा' },
      { value: 'coffee', label_en: 'Coffee (कॉफी)', label_mr: 'कॉफी' },
      { value: 'milk', label_en: 'Milk (दूध)', label_mr: 'दूध' },
      { value: 'juice', label_en: 'Fruit Juice', label_mr: 'ज्यूस' },
      { value: 'cold_drink', label_en: 'Cold Drinks', label_mr: 'कोल्ड ड्रिंक' },
      { value: 'alcohol', label_en: 'Alcohol', label_mr: 'दारू / मद्य' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.diet,
    field_key: 'food_taste_preference', label_en: 'Food Taste Preference', label_mr: 'आवडते चव',
    input_type: 'multi_select', sort_order: 59,
    options: [
      { value: 'sweet', label_en: 'Sweet (गोड)', label_mr: 'गोड' },
      { value: 'salty', label_en: 'Salty (खारट)', label_mr: 'खारट' },
      { value: 'sour', label_en: 'Sour (आंबट)', label_mr: 'आंबट' },
      { value: 'spicy', label_en: 'Spicy (तिखट)', label_mr: 'तिखट' },
      { value: 'bitter', label_en: 'Bitter (कडू)', label_mr: 'कडू' },
      { value: 'astringent', label_en: 'Astringent (तुरट)', label_mr: 'तुरट' },
    ],
  }),

  // ── SECTION 7: Bowel Habits ───────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.bowel,
    field_key: 'bowel_frequency', label_en: 'Bowel Frequency', label_mr: 'मल किती वेळा होतो',
    input_type: 'select', sort_order: 60,
    options: [
      { value: 'once', label_en: 'Once a day', label_mr: 'एकदा' },
      { value: 'twice', label_en: 'Twice a day', label_mr: 'दोनदा' },
      { value: 'irregular', label_en: 'Irregular', label_mr: 'अनियमित' },
      { value: 'constipated', label_en: 'Constipated', label_mr: 'बद्धकोष्ठ' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.bowel,
    field_key: 'bowel_consistency', label_en: 'Stool Consistency', label_mr: 'मलाचे स्वरूप',
    input_type: 'select', sort_order: 61,
    options: [
      { value: 'normal', label_en: 'Normal', label_mr: 'सामान्य' },
      { value: 'hard', label_en: 'Hard (खडा)', label_mr: 'खडा / घट्ट' },
      { value: 'loose', label_en: 'Loose / Watery (पातळ)', label_mr: 'पातळ' },
      { value: 'alternating', label_en: 'Alternating', label_mr: 'कधी घट्ट कधी पातळ' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.bowel,
    field_key: 'bowel_trigger', label_en: 'Triggered by Tea/Coffee', label_mr: 'चहा-कॉफी घेतल्यावर संवेदना',
    input_type: 'select', sort_order: 62,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.bowel,
    field_key: 'avsishtha', label_en: 'Incomplete Evacuation Feeling', label_mr: 'अवशिष्ट / अपूर्ण झाल्याची भावना',
    input_type: 'select', sort_order: 63,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),

  // ── SECTION 8: Urination ──────────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.urine,
    field_key: 'urine_frequency', label_en: 'Urination - Times per day', label_mr: 'लघवी किती वेळा (दिवसा)',
    input_type: 'number', sort_order: 70,
    validation: { min: 1, max: 30 },
  }),
  makeField('GLOBAL', {
    ...SECTIONS.urine,
    field_key: 'urine_night', label_en: 'Night Urination', label_mr: 'रात्री लघवीसाठी उठणे',
    input_type: 'select', sort_order: 71,
    options: [
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
      { value: 'once', label_en: 'Once', label_mr: 'एकदा' },
      { value: 'twice_more', label_en: '2 or more times', label_mr: '२ किंवा जास्त वेळा' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.urine,
    field_key: 'urine_color', label_en: 'Urine Color', label_mr: 'लघवीचा रंग',
    input_type: 'select', sort_order: 72,
    options: [
      { value: 'pale_yellow', label_en: 'Pale Yellow (फिकट पिवळा)', label_mr: 'फिकट पिवळा' },
      { value: 'yellow', label_en: 'Yellow (पिवळा)', label_mr: 'पिवळा' },
      { value: 'dark_yellow', label_en: 'Dark Yellow (गडद पिवळा)', label_mr: 'गडद पिवळा' },
      { value: 'reddish', label_en: 'Reddish', label_mr: 'लालसर' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.urine,
    field_key: 'urine_burning', label_en: 'Burning or Pain during urination', label_mr: 'लघवीत जळजळ / दुखणे',
    input_type: 'select', sort_order: 73,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),

  // ── SECTION 9: Perspiration ───────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.sweat,
    field_key: 'sweat_amount', label_en: 'Sweating Amount', label_mr: 'घाम किती येतो',
    input_type: 'select', sort_order: 80,
    options: [
      { value: 'none', label_en: 'None (घाम येत नाही)', label_mr: 'घाम येत नाही' },
      { value: 'normal', label_en: 'Normal', label_mr: 'सामान्य' },
      { value: 'excess', label_en: 'Excessive', label_mr: 'जास्त' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.sweat,
    field_key: 'sweat_smell', label_en: 'Unpleasant Sweat Smell', label_mr: 'घामाला दुर्गंध',
    input_type: 'select', sort_order: 81,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),

  // ── SECTION 10: Menstrual History (Female) ────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'menstrual_cycle', label_en: 'Menstrual Cycle', label_mr: 'पाळी चक्र',
    input_type: 'select', sort_order: 90,
    options: [
      { value: 'regular', label_en: 'Regular (नियमित)', label_mr: 'नियमित' },
      { value: 'irregular', label_en: 'Irregular (अनियमित)', label_mr: 'अनियमित' },
      { value: 'stopped', label_en: 'Menopause (रजोनिवृत्ती)', label_mr: 'रजोनिवृत्ती' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'menstrual_duration', label_en: 'Duration (days)', label_mr: 'पाळीचा कालावधी (दिवस)',
    input_type: 'number', sort_order: 91,
    validation: { min: 1, max: 15 },
  }),
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'menstrual_color', label_en: 'Menstrual Blood Color', label_mr: 'पाळीचा रंग',
    input_type: 'select', sort_order: 92,
    options: [
      { value: 'red', label_en: 'Red (लाल)', label_mr: 'लाल' },
      { value: 'dark', label_en: 'Dark (काळपट)', label_mr: 'काळपट' },
      { value: 'black', label_en: 'Black (काळा)', label_mr: 'काळा' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'menstrual_clots', label_en: 'Clots in Menstrual Blood', label_mr: 'आम / गुठळ्या पाळीत',
    input_type: 'select', sort_order: 93,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'menstrual_pain', label_en: 'Pain during Menstrual Cycle', label_mr: 'पाळीत वेदना',
    input_type: 'select', sort_order: 94,
    options: [
      { value: 'none', label_en: 'None', label_mr: 'नाही' },
      { value: 'mild', label_en: 'Mild', label_mr: 'सौम्य' },
      { value: 'severe', label_en: 'Severe', label_mr: 'तीव्र' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.menstrual,
    field_key: 'leucorrhoea', label_en: 'Leucorrhoea (White Discharge)', label_mr: 'श्वेतप्रदर (पांढरे स्राव)',
    input_type: 'select', sort_order: 95,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),

  // ── SECTION 11: Mental Status ──────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.mental,
    field_key: 'mental_state', label_en: 'General Mental State', label_mr: 'सामान्य मानसिक स्थिती',
    input_type: 'select', sort_order: 100,
    options: [
      { value: 'calm', label_en: 'Calm / Stable', label_mr: 'शांत / स्थिर' },
      { value: 'anxious', label_en: 'Anxious / Worried', label_mr: 'चिंताग्रस्त / काळजीत' },
      { value: 'depressed', label_en: 'Depressed', label_mr: 'उदास / नैराश्य' },
      { value: 'irritable', label_en: 'Irritable', label_mr: 'चिडचिडे' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.mental,
    field_key: 'stress_level', label_en: 'Stress Level', label_mr: 'ताणाची पातळी',
    input_type: 'select', sort_order: 101,
    options: [
      { value: 'none', label_en: 'None', label_mr: 'नाही' },
      { value: 'mild', label_en: 'Mild', label_mr: 'सौम्य' },
      { value: 'moderate', label_en: 'Moderate', label_mr: 'मध्यम' },
      { value: 'high', label_en: 'High', label_mr: 'जास्त' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.mental,
    field_key: 'marital_status', label_en: 'Marital Status', label_mr: 'वैवाहिक स्थिती',
    input_type: 'select', sort_order: 102,
    options: [
      { value: 'single', label_en: 'Unmarried', label_mr: 'अविवाहित' },
      { value: 'married', label_en: 'Married', label_mr: 'विवाहित' },
      { value: 'divorced', label_en: 'Divorced/Separated', label_mr: 'घटस्फोट / विभक्त' },
      { value: 'widowed', label_en: 'Widowed', label_mr: 'विधवा / विधुर' },
    ],
  }),

  // ── SECTION 12: Sleep ─────────────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.sleep,
    field_key: 'sleep_duration', label_en: 'Sleep Duration (hours)', label_mr: 'झोपेचा कालावधी (तास)',
    input_type: 'number', sort_order: 110,
    validation: { min: 1, max: 24 },
  }),
  makeField('GLOBAL', {
    ...SECTIONS.sleep,
    field_key: 'sleep_quality', label_en: 'Sleep Quality', label_mr: 'झोपेचे स्वरूप',
    input_type: 'select', sort_order: 111,
    options: [
      { value: 'sound', label_en: 'Sound Sleep (गाढ झोप)', label_mr: 'गाढ झोप' },
      { value: 'disturbed', label_en: 'Disturbed', label_mr: 'झोपमोड' },
      { value: 'less', label_en: 'Less Sleep', label_mr: 'कमी झोप' },
      { value: 'insomnia', label_en: 'Insomnia (निद्रानाश)', label_mr: 'निद्रानाश' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.sleep,
    field_key: 'afternoon_sleep', label_en: 'Afternoon Nap', label_mr: 'दुपारची झोप',
    input_type: 'select', sort_order: 112,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
      { value: 'sometimes', label_en: 'Sometimes', label_mr: 'कधीकधी' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.sleep,
    field_key: 'dreams', label_en: 'Dreams at Night', label_mr: 'रात्री स्वप्ने',
    input_type: 'select', sort_order: 113,
    options: [
      { value: 'none', label_en: 'Rarely / None', label_mr: 'क्वचित / नाही' },
      { value: 'sometimes', label_en: 'Sometimes', label_mr: 'कधीकधी' },
      { value: 'always', label_en: 'Always / Disturbing', label_mr: 'नेहमी / त्रासदायक' },
    ],
  }),

  // ── SECTION 13: Addictions ────────────────────────────────────
  makeField('GLOBAL', {
    ...SECTIONS.addictions,
    field_key: 'tobacco_use', label_en: 'Tobacco Use', label_mr: 'तंबाखू / सिगारेट',
    input_type: 'select', sort_order: 120,
    options: [
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
      { value: 'cigarette', label_en: 'Cigarette', label_mr: 'सिगारेट' },
      { value: 'bidi', label_en: 'Bidi', label_mr: 'बिडी' },
      { value: 'chewing', label_en: 'Chewing Tobacco', label_mr: 'तंबाखू चघळणे' },
      { value: 'gutka', label_en: 'Gutka / Zarda', label_mr: 'गुटखा / जर्दा' },
      { value: 'hookah', label_en: 'Hookah', label_mr: 'हुक्का' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.addictions,
    field_key: 'alcohol_use', label_en: 'Alcohol Use', label_mr: 'मद्यपान',
    input_type: 'select', sort_order: 121,
    options: [
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
      { value: 'occasional', label_en: 'Occasional', label_mr: 'कधीकधी' },
      { value: 'regular', label_en: 'Regular', label_mr: 'नियमित' },
      { value: 'heavy', label_en: 'Heavy', label_mr: 'जास्त' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.addictions,
    field_key: 'pan_supari', label_en: 'Pan / Supari', label_mr: 'पान / सुपारी',
    input_type: 'select', sort_order: 122,
    options: [
      { value: 'yes', label_en: 'Yes', label_mr: 'होय' },
      { value: 'no', label_en: 'No', label_mr: 'नाही' },
    ],
  }),
  makeField('GLOBAL', {
    ...SECTIONS.addictions,
    field_key: 'other_addiction', label_en: 'Other Addictions', label_mr: 'इतर व्यसने',
    input_type: 'text', sort_order: 123,
    placeholder_en: 'Any other addiction', placeholder_mr: 'इतर व्यसनांचा उल्लेख करा',
  }),
];

// ══════════════════════════════════════════════════════════════════
// HOSPITAL-SPECIFIC CONFIG FOR TARGET HOSPITAL
// Overrides + custom fields only for this hospital
// ══════════════════════════════════════════════════════════════════
const HOSPITAL_SPECIFIC_FIELDS = [
  // Override chief_complaint to be required for this hospital
  makeField(TARGET_HOSPITAL_ID, {
    ...SECTIONS.chief_complaint,
    form_type: 'HISTORY',
    field_key: 'chief_complaint',
    label_en: 'Chief Complaint (Required)',
    label_mr: 'प्रधान वेदना (अनिवार्य)',
    input_type: 'textarea',
    is_required: true,
    sort_order: 1,
  }),
  // Hospital-specific custom field: Token Number
  makeField(TARGET_HOSPITAL_ID, {
    ...SECTIONS.chief_complaint,
    form_type: 'HISTORY',
    field_key: 'nadi_type',
    label_en: 'Nadi Type (Specific)',
    label_mr: 'नाडी प्रकार (विशेष)',
    input_type: 'select',
    sort_order: 5,
    options: [
      { value: 'vata_dominant', label_en: 'Vata Dominant', label_mr: 'वात प्रधान' },
      { value: 'pitta_dominant', label_en: 'Pitta Dominant', label_mr: 'पित्त प्रधान' },
      { value: 'kapha_dominant', label_en: 'Kapha Dominant', label_mr: 'कफ प्रधान' },
      { value: 'vata_pitta', label_en: 'Vata-Pitta', label_mr: 'वात-पित्त' },
      { value: 'pitta_kapha', label_en: 'Pitta-Kapha', label_mr: 'पित्त-कफ' },
      { value: 'vata_kapha', label_en: 'Vata-Kapha', label_mr: 'वात-कफ' },
    ],
  }),
];

// ══════════════════════════════════════════════════════════════════
// HOSPITAL-SPECIFIC RECEPTION FORM OVERRIDES
// ══════════════════════════════════════════════════════════════════
const RECEPTION_HOSPITAL_FIELDS = [
  // Override mobile to be required with custom label
  {
    field_id: uuidv4(),
    hospital_id: TARGET_HOSPITAL_ID,
    form_type: 'RECEPTION',
    is_active: true,
    is_required: true,
    hospital_type: 'AYURVEDIC',
    created_at: now,
    updated_at: now,
    section: 'registration',
    section_label_en: 'Registration Info',
    section_label_mr: 'नोंदणी माहिती',
    section_sort_order: 1,
    field_key: 'token_number',
    label_en: 'Token Number',
    label_mr: 'टोकन क्रमांक',
    input_type: 'computed',
    sort_order: 0,
  },
  // Hospital-specific: Treatment type preference
  {
    field_id: uuidv4(),
    hospital_id: TARGET_HOSPITAL_ID,
    form_type: 'RECEPTION',
    is_active: true,
    is_required: false,
    hospital_type: 'AYURVEDIC',
    created_at: now,
    updated_at: now,
    section: 'medical',
    section_label_en: 'Medical Information',
    section_label_mr: 'वैद्यकीय माहिती',
    section_sort_order: 5,
    field_key: 'treatment_preference',
    label_en: 'Treatment Preference',
    label_mr: 'उपचाराची पद्धत',
    input_type: 'select',
    sort_order: 20,
    options: [
      { value: 'panchakarma', label_en: 'Panchakarma', label_mr: 'पंचकर्म' },
      { value: 'ayurvedic_medicine', label_en: 'Ayurvedic Medicines', label_mr: 'आयुर्वेदिक औषधे' },
      { value: 'both', label_en: 'Both', label_mr: 'दोन्ही' },
    ],
  },
];

const ALL_FIELDS = [
  ...GLOBAL_HISTORY_FIELDS,
  ...HOSPITAL_SPECIFIC_FIELDS,
  ...RECEPTION_HOSPITAL_FIELDS,
];

// ══════════════════════════════════════════════════════════════════
// RUN SEED
// ══════════════════════════════════════════════════════════════════
async function seedHistoryFields() {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║   AYURVEDIC HISTORY FORM FIELDS SEED                     ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  console.log(`Target Hospital: ${TARGET_HOSPITAL_NAME} (${TARGET_HOSPITAL_ID})`);
  console.log(`Table: ${FORM_FIELDS_TABLE}\n`);

  let success = 0, failed = 0;

  for (const field of ALL_FIELDS) {
    try {
      await db.send(new PutCommand({ TableName: FORM_FIELDS_TABLE, Item: field }));
      const scope = field.hospital_id === 'GLOBAL' ? 'GLOBAL' : 'HOSPITAL';
      console.log(`  ✅ [${scope}][${field.form_type}] ${field.field_key}`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${field.field_key}:`, err.message);
      failed++;
    }
  }

  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`  Seeded: ${success} fields | Failed: ${failed}`);
  console.log(`\n  Breakdown:`);
  console.log(`  • GLOBAL Ayurvedic HISTORY fields: ${GLOBAL_HISTORY_FIELDS.length}`);
  console.log(`  • Hospital-specific HISTORY overrides: ${HOSPITAL_SPECIFIC_FIELDS.length}`);
  console.log(`  • Hospital-specific RECEPTION additions: ${RECEPTION_HOSPITAL_FIELDS.length}`);
  console.log(`──────────────────────────────────────────────────────────\n`);
}

seedHistoryFields().catch(console.error);
