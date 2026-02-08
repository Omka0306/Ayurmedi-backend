require('dotenv').config();

const { createMedicine } = require('../persistence/medicine.repo');
const { createDropdownCategory, createDropdownOption } = require('../persistence/dropdown.repo');

// Test single medicine insert
async function testMedicineInsert() {
  console.log('\n=== Testing Medicine Insert ===');
  try {
    const medicine = await createMedicine({
      hospital_id: null,
      name_mr: 'टेस्ट औषध',
      name_en: 'Test Medicine',
      medicine_type: 'tablet',
      price: 100,
      is_active: true,
    });
    console.log('✅ SUCCESS:', medicine);
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    console.log('Full error:', err);
  }
}

// Test dropdown category insert
async function testDropdownInsert() {
  console.log('\n=== Testing Dropdown Category Insert ===');
  try {
    const category = await createDropdownCategory({
      hospital_id: null,
      dropdown_code: 'test_dropdown',
      label_mr: 'टेस्ट ड्रॉपडाउन',
      label_en: 'Test Dropdown',
      section_name: 'Test',
      input_type: 'select',
      sort_order: 1,
      is_active: true,
    });
    console.log('✅ SUCCESS:', category);
    
    // Test option insert
    console.log('\n=== Testing Dropdown Option Insert ===');
    try {
      const option = await createDropdownOption({
        dropdown_id: category.dropdown_id,
        hospital_id: null,
        value_code: 'test_value',
        label_mr: 'टेस्ट',
        label_en: 'Test',
        sort_order: 1,
        is_active: true,
      });
      console.log('✅ SUCCESS:', option);
    } catch (err) {
      console.log('❌ OPTION ERROR:', err.message);
      console.log('Full error:', err);
    }
  } catch (err) {
    console.log('❌ CATEGORY ERROR:', err.message);
    console.log('Full error:', err);
  }
}

async function run() {
  await testMedicineInsert();
  await testDropdownInsert();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
