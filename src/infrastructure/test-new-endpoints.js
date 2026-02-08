require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://m6y68bub70.execute-api.ap-south-1.amazonaws.com';
let authToken = '';

function makeRequest(method, path, data = null, useAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testNewEndpoints() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     NEW COMPREHENSIVE APIS - TEST REPORT              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // LOGIN
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'admin@ayurmedi.com',
    password: 'Admin@2026',
  });
  
  if (loginRes.status === 200 && loginRes.data.success) {
    authToken = loginRes.data.data.accessToken;
    console.log('✅ Login successful\n');
  } else {
    console.log('❌ Login failed\n');
    return;
  }

  // TEST 1: GET ALL DROPDOWNS WITH OPTIONS
  console.log('1. GET /dropdowns/all-with-options');
  const allDropRes = await makeRequest('GET', '/dropdowns/all-with-options?lang=en', null, true);
  console.log(`   Status: ${allDropRes.status}`);
  if (allDropRes.status === 200 && allDropRes.data.success) {
    const count = allDropRes.data.data?.dropdowns?.length || 0;
    const totalOptions = allDropRes.data.data?.dropdowns?.reduce((sum, d) => sum + (d.options?.length || 0), 0) || 0;
    console.log(`   ✅ PASS - ${count} categories with ${totalOptions} total options`);
    console.log(`   Sample: ${allDropRes.data.data.dropdowns[0]?.dropdown_code} - ${allDropRes.data.data.dropdowns[0]?.options?.length} options\n`);
  } else {
    console.log(`   ❌ FAIL - ${JSON.stringify(allDropRes.data).substring(0, 100)}\n`);
  }

  // TEST 2: GET MEDICINES BY TYPE
  console.log('2. GET /medicines/by-type');
  const byTypeRes = await makeRequest('GET', '/medicines/by-type', null, true);
  console.log(`   Status: ${byTypeRes.status}`);
  if (byTypeRes.status === 200 && byTypeRes.data.success) {
    const types = Object.keys(byTypeRes.data.data?.medicines_by_type || {});
    console.log(`   ✅ PASS - ${types.length} medicine types found`);
    types.forEach(type => {
      const count = byTypeRes.data.data.medicines_by_type[type].length;
      console.log(`      - ${type}: ${count} medicines`);
    });
    console.log('');
  } else {
    console.log(`   ❌ FAIL - ${JSON.stringify(byTypeRes.data).substring(0, 100)}\n`);
  }

  // TEST 3: CREATE DROPDOWN CATEGORY
  console.log('3. POST /dropdowns/category/create');
  const createCatRes = await makeRequest('POST', '/dropdowns/category/create', {
    dropdown_code: 'test_category',
    label_mr: 'टेस्ट श्रेणी',
    label_en: 'Test Category',
    section_name: 'Testing',
    input_type: 'select',
    sort_order: 99
  }, true);
  console.log(`   Status: ${createCatRes.status}`);
  if (createCatRes.status === 200) {
    console.log(`   ✅ PASS - Category created\n`);
  } else {
    console.log(`   ⚠️  ${createCatRes.status} - ${JSON.stringify(createCatRes.data).substring(0, 150)}\n`);
  }

  // TEST 4: CREATE DROPDOWN OPTION
  console.log('4. POST /dropdowns/option/create');
  const createOptRes = await makeRequest('POST', '/dropdowns/option/create', {
    dropdown_code: 'purvrut',
    value_code: 'test_condition',
    label_mr: 'टेस्ट स्थिती',
    label_en: 'Test Condition',
    sort_order: 99
  }, true);
  console.log(`   Status: ${createOptRes.status}`);
  if (createOptRes.status === 200) {
    console.log(`   ✅ PASS - Option created\n`);
  } else {
    console.log(`   ⚠️  ${createOptRes.status} - ${JSON.stringify(createOptRes.data).substring(0, 150)}\n`);
  }

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                  TESTING COMPLETE                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

testNewEndpoints().catch(console.error);
