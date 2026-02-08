require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://m6y68bub70.execute-api.ap-south-1.amazonaws.com';
let authToken = '';
let hospitalId = '';

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

async function testAPIs() {
  console.log('\n========================================');
  console.log('  COMPLETE API TESTING REPORT');
  console.log('========================================\n');

  const results = {
    passed: [],
    failed: [],
    auth: {},
    data: {}
  };

  try {
    // 1. LOGIN
    console.log('1. POST /auth/login');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'admin@ayurmedi.com',
      password: 'Admin@2026',
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.status === 200 && loginRes.data.success) {
      authToken = loginRes.data.data.accessToken;
      results.passed.push('Login');
      results.auth.superAdminToken = authToken.substring(0, 50) + '...';
      console.log('   ✅ PASS - Token obtained\n');
    } else {
      results.failed.push({ api: 'Login', error: JSON.stringify(loginRes.data) });
      console.log('   ❌ FAIL\n');
      return results;
    }

    // 2. LIST MEDICINES
    console.log('2. GET /medicines/list');
    const medListRes = await makeRequest('GET', '/medicines/list', null, true);
    console.log(`   Status: ${medListRes.status}`);
    if (medListRes.status === 200) {
      results.passed.push('List Medicines');
      results.data.medicinesCount = medListRes.data.data?.medicines?.length || 0;
      console.log(`   ✅ PASS - Found ${results.data.medicinesCount} medicines\n`);
    } else {
      results.failed.push({ api: 'List Medicines', error: JSON.stringify(medListRes.data).substring(0, 100) });
      console.log(`   ❌ FAIL - ${JSON.stringify(medListRes.data).substring(0, 100)}\n`);
    }

    // 3. SEARCH MEDICINES
    console.log('3. GET /medicines/search?query=त्रिफला');
    const searchRes = await makeRequest('GET', '/medicines/search?query=त्रिफला', null, true);
    console.log(`   Status: ${searchRes.status}`);
    if (searchRes.status === 200) {
      results.passed.push('Search Medicines');
      results.data.searchResults = searchRes.data.data?.medicines?.length || 0;
      console.log(`   ✅ PASS - Found ${results.data.searchResults} results\n`);
    } else {
      results.failed.push({ api: 'Search Medicines', error: JSON.stringify(searchRes.data).substring(0, 100) });
      console.log(`   ❌ FAIL\n`);
    }

    // 4. LIST DROPDOWNS
    console.log('4. GET /dropdowns/list');
    const dropdownsRes = await makeRequest('GET', '/dropdowns/list', null, true);
    console.log(`   Status: ${dropdownsRes.status}`);
    if (dropdownsRes.status === 200) {
      results.passed.push('List Dropdowns');
      results.data.dropdownsCount = dropdownsRes.data.data?.categories?.length || 0;
      console.log(`   ✅ PASS - Found ${results.data.dropdownsCount} dropdown categories\n`);
    } else {
      results.failed.push({ api: 'List Dropdowns', error: JSON.stringify(dropdownsRes.data).substring(0, 100) });
      console.log(`   ❌ FAIL\n`);
    }

    // 5. GET DROPDOWN OPTIONS
    console.log('5. GET /dropdowns/purvrut/options');
    const optionsRes = await makeRequest('GET', '/dropdowns/purvrut/options', null, true);
    console.log(`   Status: ${optionsRes.status}`);
    if (optionsRes.status === 200) {
      results.passed.push('Get Dropdown Options');
      results.data.optionsCount = optionsRes.data.data?.options?.length || 0;
      console.log(`   ✅ PASS - Found ${results.data.optionsCount} options\n`);
    } else {
      results.failed.push({ api: 'Get Dropdown Options', error: JSON.stringify(optionsRes.data).substring(0, 100) });
      console.log(`   ❌ FAIL\n`);
    }

    // 6. REGISTER HOSPITAL
    console.log('6. POST /hospital/register');
    const hospitalRes = await makeRequest('POST', '/hospital/register', {
      hospital_code: 'HOSP_TEST_001',
      name: 'Test Hospital',
      address: '123 Test St',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      contact_number: '9876543210',
      email: 'test@hospital.com',
      admin_email: 'admin@testhospital.com',
      admin_password: 'TestAdmin@123',
      admin_full_name: 'Test Admin'
    }, true);
    console.log(`   Status: ${hospitalRes.status}`);
    if (hospitalRes.status === 200 && hospitalRes.data.success) {
      results.passed.push('Register Hospital');
      hospitalId = hospitalRes.data.data.hospital.hospital_id;
      results.data.hospitalId = hospitalId;
      console.log(`   ✅ PASS - Hospital ID: ${hospitalId}\n`);
    } else {
      results.failed.push({ api: 'Register Hospital', error: JSON.stringify(hospitalRes.data).substring(0, 150) });
      console.log(`   ⚠️ WARN/FAIL - ${JSON.stringify(hospitalRes.data).substring(0, 150)}\n`);
    }

    // 7. LOGIN AS HOSPITAL ADMIN
    if (hospitalId) {
      console.log('7. POST /auth/login (Hospital Admin)');
      const haLoginRes = await makeRequest('POST', '/auth/login', {
        email: 'admin@testhospital.com',
        password: 'TestAdmin@123'
      });
      console.log(`   Status: ${haLoginRes.status}`);
      if (haLoginRes.status === 200 && haLoginRes.data.success) {
        const haToken = haLoginRes.data.data.accessToken;
        authToken = haToken; // Switch to hospital admin token
        results.passed.push('Hospital Admin Login');
        results.auth.hospitalAdminToken = haToken.substring(0, 50) + '...';
        console.log('   ✅ PASS - Hospital Admin token obtained\n');
      } else {
        results.failed.push({ api: 'Hospital Admin Login', error: JSON.stringify(haLoginRes.data) });
        console.log('   ❌ FAIL\n');
      }
    }

    // 8. CREATE MEDICINE (Hospital-specific)
    console.log('8. POST /medicines/create');
    const medCreateRes = await makeRequest('POST', '/medicines/create', {
      name_mr: 'अश्वगंधारिष्ट',
      name_en: 'Ashwagandharishta',
      medicine_type: 'arishta',
      price: 250,
      description: 'Immunity booster'
    }, true);
    console.log(`   Status: ${medCreateRes.status}`);
    if (medCreateRes.status === 200) {
      results.passed.push('Create Medicine');
      console.log('   ✅ PASS\n');
    } else {
      results.failed.push({ api: 'Create Medicine', error: JSON.stringify(medCreateRes.data).substring(0, 100) });
      console.log(`   ⚠️ WARN/FAIL - ${JSON.stringify(medCreateRes.data).substring(0, 100)}\n`);
    }

    console.log('\n========================================');
    console.log('  TEST SUMMARY');
    console.log('========================================\n');
    console.log(`✅ Passed: ${results.passed.length}/8`);
    console.log(`❌ Failed: ${results.failed.length}/8\n`);
    
    if (results.passed.length > 0) {
      console.log('Passed Tests:');
      results.passed.forEach(test => console.log(`  - ${test}`));
      console.log('');
    }
    
    if (results.failed.length > 0) {
      console.log('Failed Tests:');
      results.failed.forEach(({ api, error }) => console.log(`  - ${api}: ${error}`));
      console.log('');
    }

    console.log('Data Retrieved:');
    console.log(`  - Medicines in DB: ${results.data.medicinesCount || 0}`);
    console.log(`  - Dropdown Categories: ${results.data.dropdownsCount || 0}`);
    console.log(`  - Search Results: ${results.data.searchResults || 0}`);
    if (results.data.hospitalId) {
      console.log(`  - Created Hospital ID: ${results.data.hospitalId}`);
    }
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
  }
}

testAPIs();
