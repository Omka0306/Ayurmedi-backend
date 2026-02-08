require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://m6y68bub70.execute-api.ap-south-1.amazonaws.com';
let authToken = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, useAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
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
  console.log('\n🧪 API Testing Suite\n');
  console.log('=' .repeat(60));

  try {
    // 1. Test Login
    console.log('\n1️⃣  Testing: POST /auth/login');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'admin@ayurmedi.com',
      password: 'Admin@2026',
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.status === 200 && loginRes.data.success) {
      authToken = loginRes.data.data.accessToken;
      console.log('   ✅ Login successful! Token obtained.');
    } else {
      console.log('   ❌ Login failed:', JSON.stringify(loginRes.data, null, 2));
      return;
    }

    // 2. Test Logout
    console.log('\n2️⃣  Testing: POST /auth/logout');
    const logoutRes = await makeRequest('POST', '/auth/logout', {}, true);
    console.log(`   Status: ${logoutRes.status}`);
    console.log(logoutRes.status === 200 || logoutRes.status === 204 ? '   ✅ Passed' : '   ❌ Failed');

    // Re-login for remaining tests
    const reloginRes = await makeRequest('POST', '/auth/login', {
      email: 'admin@ayurmedi.com',
      password: 'Admin@2026',
    });
    authToken = reloginRes.data.data.accessToken;

    // 3. Test Hospital Register
    console.log('\n3️⃣  Testing: POST /hospital/register');
    const hospitalRes = await makeRequest(
      'POST',
      '/hospital/register',
      {
        hospital_code: 'TEST001',
        name: 'Test Hospital',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        country: 'India',
        pincode: '123456',
        contact_number: '1234567890',
        email: 'test@hospital.com',
        admin_email: 'admin@testhospital.com',
        admin_password: 'TestAdmin@123',
        admin_full_name: 'Test Admin',
      },
      true
    );
    console.log(`   Status: ${hospitalRes.status}`);
    console.log(hospitalRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(hospitalRes.data).substring(0, 100)}`);

    // 4. Test User Create
    console.log('\n4️⃣  Testing: POST /user/create');
    const userRes = await makeRequest(
      'POST',
      '/user/create',
      {
        full_name: 'Test Doctor',
        email: 'doctor@test.com',
        role: 'DOCTOR',
        password: 'Doctor@123',
      },
      true
    );
    console.log(`   Status: ${userRes.status}`);
    console.log(userRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(userRes.data).substring(0, 100)}`);

    // 5. Test Medicine Create
    console.log('\n5️⃣  Testing: POST /medicines/create');
    const medicineCreateRes = await makeRequest(
      'POST',
      '/medicines/create',
      {
        name_mr: 'परासिटामोल',
        name_en: 'Paracetamol',
        medicine_type: 'ALLOPATHY',
        description: 'Pain relief medicine',
      },
      true
    );
    console.log(`   Status: ${medicineCreateRes.status}`);
    console.log(medicineCreateRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(medicineCreateRes.data).substring(0, 100)}`);

    // 6. Test Medicine List
    console.log('\n6️⃣  Testing: GET /medicines/list');
    const medicineListRes = await makeRequest('GET', '/medicines/list', null, true);
    console.log(`   Status: ${medicineListRes.status}`);
    console.log(medicineListRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(medicineListRes.data).substring(0, 100)}`);

    // 7. Test Medicine Search
    console.log('\n7️⃣  Testing: GET /medicines/search?query=para');
    const medicineSearchRes = await makeRequest('GET', '/medicines/search?query=para', null, true);
    console.log(`   Status: ${medicineSearchRes.status}`);
    console.log(medicineSearchRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(medicineSearchRes.data).substring(0, 100)}`);

    // 8. Test Dropdowns List
    console.log('\n8️⃣  Testing: GET /dropdowns/list');
    const dropdownsRes = await makeRequest('GET', '/dropdowns/list', null, true);
    console.log(`   Status: ${dropdownsRes.status}`);
    console.log(dropdownsRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(dropdownsRes.data).substring(0, 100)}`);

    // 9. Test Dropdown Options
    console.log('\n9️⃣  Testing: GET /dropdowns/{dropdown_code}/options');
    const dropdownOptionsRes = await makeRequest('GET', '/dropdowns/GENDER/options', null, true);
    console.log(`   Status: ${dropdownOptionsRes.status}`);
    console.log(dropdownOptionsRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(dropdownOptionsRes.data).substring(0, 100)}`);

    // 10. Test Disease Create
    console.log('\n🔟 Testing: POST /diseases/create');
    const diseaseCreateRes = await makeRequest(
      'POST',
      '/diseases/create',
      {
        name_mr: 'ताप',
        name_en: 'Fever',
        description: 'Common fever',
      },
      true
    );
    console.log(`   Status: ${diseaseCreateRes.status}`);
    console.log(diseaseCreateRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(diseaseCreateRes.data).substring(0, 100)}`);

    // 11. Test Disease List
    console.log('\n1️⃣1️⃣  Testing: GET /diseases/list');
    const diseaseListRes = await makeRequest('GET', '/diseases/list', null, true);
    console.log(`   Status: ${diseaseListRes.status}`);
    console.log(diseaseListRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(diseaseListRes.data).substring(0, 100)}`);

    // 12. Test Treatment Create
    console.log('\n1️⃣2️⃣  Testing: POST /treatments/create');
    const treatmentCreateRes = await makeRequest(
      'POST',
      '/treatments/create',
      {
        disease_id: 'test-disease-id',
        name_mr: 'उपचार',
        name_en: 'Treatment',
        description: 'Test treatment',
      },
      true
    );
    console.log(`   Status: ${treatmentCreateRes.status}`);
    console.log(treatmentCreateRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(treatmentCreateRes.data).substring(0, 100)}`);

    // 13. Test Prescription Template Create
    console.log('\n1️⃣3️⃣  Testing: POST /prescriptions/template/create');
    const templateCreateRes = await makeRequest(
      'POST',
      '/prescriptions/template/create',
      {
        disease_id: 'test-disease-id',
        template_name: 'Fever Treatment',
        medicines: [],
      },
      true
    );
    console.log(`   Status: ${templateCreateRes.status}`);
    console.log(templateCreateRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(templateCreateRes.data).substring(0, 100)}`);

    // 14. Test Prescription Templates List
    console.log('\n1️⃣4️⃣  Testing: GET /prescriptions/templates/list');
    const templatesListRes = await makeRequest('GET', '/prescriptions/templates/list', null, true);
    console.log(`   Status: ${templatesListRes.status}`);
    console.log(templatesListRes.status === 200 ? '   ✅ Passed' : `   ⚠️  ${JSON.stringify(templatesListRes.data).substring(0, 100)}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ API Testing Complete!\n');
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
  }
}

testAPIs();
