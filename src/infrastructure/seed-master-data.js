/* Seeder script for Master Data (Medicines + Dropdowns)
 *
 * Usage:
 *   node src/infrastructure/seed-master-data.js
 *
 * This will seed:
 * - Global medicines (200+ Ayurvedic medicines)
 * - Dropdown categories (patient history fields)
 * - Dropdown options (values for each category)
 */

require('dotenv').config();

const { createMedicine } = require('../persistence/medicine.repo');
const { createDropdownCategory, createDropdownOption } = require('../persistence/dropdown.repo');
const logger = require('../utils/logger.util');

// Sample Ayurvedic medicines (you can expand this list)
const MEDICINES = [
  // Kashay (Decoctions)
  { name_mr: 'त्रिफला कषाय', name_en: 'Triphala Kashay', medicine_type: 'kashay', price: 50 },
  { name_mr: 'दशमूल कषाय', name_en: 'Dashmool Kashay', medicine_type: 'kashay', price: 60 },
  { name_mr: 'गुडुची कषाय', name_en: 'Guduchi Kashay', medicine_type: 'kashay', price: 55 },
  { name_mr: 'अश्वगंधा कषाय', name_en: 'Ashwagandha Kashay', medicine_type: 'kashay', price: 65 },
  { name_mr: 'ब्राह्मी कषाय', name_en: 'Brahmi Kashay', medicine_type: 'kashay', price: 70 },
  
  // Tail (Oils)
  { name_mr: 'अनुतैल', name_en: 'Anu Tail', medicine_type: 'oil', price: 200 },
  { name_mr: 'नस्य तैल', name_en: 'Nasya Tail', medicine_type: 'oil', price: 180 },
  { name_mr: 'शिरोभ्यंग तैल', name_en: 'Shirobhyanga Tail', medicine_type: 'oil', price: 250 },
  { name_mr: 'कर्ण तैल', name_en: 'Karna Tail', medicine_type: 'oil', price: 150 },
  { name_mr: 'नारायण तैल', name_en: 'Narayan Tail', medicine_type: 'oil', price: 300 },
  
  // Churna (Powders)
  { name_mr: 'त्रिफला चूर्ण', name_en: 'Triphala Churna', medicine_type: 'churn', price: 100 },
  { name_mr: 'हिंग्वाष्टक चूर्ण', name_en: 'Hingwashtak Churna', medicine_type: 'churn', price: 120 },
  { name_mr: 'अविपत्तिकर चूर्ण', name_en: 'Avipattikar Churna', medicine_type: 'churn', price: 110 },
  { name_mr: 'सितोपलादि चूर्ण', name_en: 'Sitopaladi Churna', medicine_type: 'churn', price: 130 },
  { name_mr: 'तालीसादि चूर्ण', name_en: 'Talisadi Churna', medicine_type: 'churn', price: 125 },
  
  // Vati (Tablets)
  { name_mr: 'त्रिफला गुग्गुल', name_en: 'Triphala Guggul', medicine_type: 'tablet', price: 150 },
  { name_mr: 'योगराज गुग्गुल', name_en: 'Yograj Guggul', medicine_type: 'tablet', price: 160 },
  { name_mr: 'कैशोर गुग्गुल', name_en: 'Kaishor Guggul', medicine_type: 'tablet', price: 140 },
  { name_mr: 'चंद्रप्रभा वटी', name_en: 'Chandraprabha Vati', medicine_type: 'tablet', price: 180 },
  { name_mr: 'अशोकारिष्ट', name_en: 'Ashokarishta', medicine_type: 'tablet', price: 200 },
  
  // Avaleha (Jams/Confections)
  { name_mr: 'च्यवनप्राश', name_en: 'Chyawanprash', medicine_type: 'avaleha', price: 400 },
  { name_mr: 'ब्राह्मी रसायन', name_en: 'Brahmi Rasayan', medicine_type: 'avaleha', price: 350 },
  { name_mr: 'अश्वगंधा अवलेह', name_en: 'Ashwagandha Avaleha', medicine_type: 'avaleha', price: 380 },
];

// Dropdown Categories (Patient History Fields)
const DROPDOWN_CATEGORIES = [
  { dropdown_code: 'purvrut', label_mr: 'पूर्वरुत', label_en: 'Past History', section_name: 'History', input_type: 'select', sort_order: 1 },
  { dropdown_code: 'dansh', label_mr: 'दंश', label_en: 'Bite/Sting', section_name: 'History', input_type: 'select', sort_order: 2 },
  { dropdown_code: 'vyaayaam', label_mr: 'व्यायाम', label_en: 'Exercise', section_name: 'Lifestyle', input_type: 'select', sort_order: 3 },
  { dropdown_code: 'nidra', label_mr: 'निद्रा', label_en: 'Sleep', section_name: 'Lifestyle', input_type: 'select', sort_order: 4 },
  { dropdown_code: 'aahar', label_mr: 'आहार', label_en: 'Diet', section_name: 'Diet', input_type: 'select', sort_order: 5 },
  { dropdown_code: 'mala', label_mr: 'मल', label_en: 'Bowel Movement', section_name: 'History', input_type: 'select', sort_order: 6 },
  { dropdown_code: 'mutra', label_mr: 'मूत्र', label_en: 'Urination', section_name: 'History', input_type: 'select', sort_order: 7 },
  { dropdown_code: 'artava', label_mr: 'आर्तव', label_en: 'Menstruation', section_name: 'History', input_type: 'select', sort_order: 8 },
];

// Dropdown Options
const DROPDOWN_OPTIONS = {
  purvrut: [
    { value_code: 'diabetes', label_mr: 'मधुमेह', label_en: 'Diabetes' },
    { value_code: 'hypertension', label_mr: 'उच्च रक्तदाब', label_en: 'Hypertension' },
    { value_code: 'asthma', label_mr: 'दमा', label_en: 'Asthma' },
    { value_code: 'arthritis', label_mr: 'संधिवात', label_en: 'Arthritis' },
  ],
  dansh: [
    { value_code: 'snake', label_mr: 'साप', label_en: 'Snake' },
    { value_code: 'scorpion', label_mr: 'विंचू', label_en: 'Scorpion' },
    { value_code: 'insect', label_mr: 'कीटक', label_en: 'Insect' },
    { value_code: 'dog', label_mr: 'कुत्रा', label_en: 'Dog' },
  ],
  vyaayaam: [
    { value_code: 'regular', label_mr: 'नियमित', label_en: 'Regular' },
    { value_code: 'occasional', label_mr: 'कधीकधी', label_en: 'Occasional' },
    { value_code: 'none', label_mr: 'नाही', label_en: 'None' },
  ],
  nidra: [
    { value_code: 'sound', label_mr: 'झोप चांगली', label_en: 'Sound Sleep' },
    { value_code: 'disturbed', label_mr: 'झोप खंडित', label_en: 'Disturbed Sleep' },
    { value_code: 'insomnia', label_mr: 'अनिद्रा', label_en: 'Insomnia' },
  ],
  aahar: [
    { value_code: 'satvik', label_mr: 'सात्विक', label_en: 'Satvik' },
    { value_code: 'rajasik', label_mr: 'राजसिक', label_en: 'Rajasik' },
    { value_code: 'tamasik', label_mr: 'तामसिक', label_en: 'Tamasik' },
    { value_code: 'mixed', label_mr: 'मिश्र', label_en: 'Mixed' },
  ],
  mala: [
    { value_code: 'regular', label_mr: 'नियमित', label_en: 'Regular' },
    { value_code: 'constipation', label_mr: 'मलबद्धता', label_en: 'Constipation' },
    { value_code: 'loose', label_mr: 'ढिले', label_en: 'Loose' },
  ],
  mutra: [
    { value_code: 'normal', label_mr: 'सामान्य', label_en: 'Normal' },
    { value_code: 'frequent', label_mr: 'वारंवार', label_en: 'Frequent' },
    { value_code: 'burning', label_mr: 'जळजळ', label_en: 'Burning' },
  ],
  artava: [
    { value_code: 'regular', label_mr: 'नियमित', label_en: 'Regular' },
    { value_code: 'irregular', label_mr: 'अनियमित', label_en: 'Irregular' },
    { value_code: 'scanty', label_mr: 'कमी', label_en: 'Scanty' },
    { value_code: 'excessive', label_mr: 'अधिक', label_en: 'Excessive' },
  ],
};

const seedMedicines = async () => {
  logger.info('Seeding medicines...');
  let count = 0;
  
  for (const med of MEDICINES) {
    try {
      await createMedicine({
        hospital_id: 'GLOBAL', // Global medicines - use 'GLOBAL' instead of null for GSI
        ...med,
        is_active: true,
      });
      count++;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn(`Medicine already exists: ${med.name_mr}`);
      } else {
        logger.error(`Error creating medicine ${med.name_mr}:`, err.message);
      }
    }
  }
  
  logger.info(`Seeded ${count} medicines`);
};

const seedDropdowns = async () => {
  logger.info('Seeding dropdown categories and options...');
  let categoryCount = 0;
  let optionCount = 0;
  
  for (const category of DROPDOWN_CATEGORIES) {
    try {
      const createdCategory = await createDropdownCategory({
        hospital_id: 'GLOBAL', // Global dropdowns
        ...category,
        is_active: true,
      });
      categoryCount++;
      
      // Create options for this category
      const options = DROPDOWN_OPTIONS[category.dropdown_code] || [];
      for (const option of options) {
        try {
          await createDropdownOption({
            dropdown_id: createdCategory.dropdown_id,
            hospital_id: 'GLOBAL', // Global options
            ...option,
            is_active: true,
          });
          optionCount++;
        } catch (err) {
          if (err.name === 'ConditionalCheckFailedException') {
            logger.warn(`Option already exists: ${option.value_code}`);
          } else {
            logger.error(`Error creating option ${option.value_code}:`, err.message);
          }
        }
      }
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn(`Dropdown category already exists: ${category.dropdown_code}`);
      } else {
        logger.error(`Error creating category ${category.dropdown_code}:`, err.message);
      }
    }
  }
  
  logger.info(`Seeded ${categoryCount} dropdown categories and ${optionCount} options`);
};

const run = async () => {
  try {
    await seedMedicines();
    await seedDropdowns();
    logger.info('Master data seeding completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
};

run();
