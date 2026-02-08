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

async function runFinalTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     AYURMEDI BACKEND - FINAL API TEST REPORT         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const results = [];

  // 1. LOGIN
  console.log('1. POST /auth/login');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'admin@ayurmedi.com',
    password: 'Admin@2026',
  });
  
  if (loginRes.status === 200 && loginRes.data.success) {
    authToken = loginRes.data.data.accessToken;
    results.push({ name: 'Auth Login', status: 'PASS', code: 200 });
    console.log('   ✅ PASS - Status: 200\n');
  } else {
    results.push({ name: 'Auth Login', status: 'FAIL', code: loginRes.status });
    console.log(`   ❌ FAIL - Status: ${loginRes.status}\n`);
    return results;
  }

  // 2. MEDICINE LIST
  console.log('2. GET /medicines/list');
  const medListRes = await makeRequest('GET', '/medicines/list', null, true);
  const medCount = medListRes.data?.data?.medicines?.length || 0;
  if (medListRes.status === 200 && medListRes.data.success) {
    results.push({ name: 'Medicine List', status: 'PASS', code: 200, detail: `${medCount} medicines` });
    console.log(`   ✅ PASS - Status: 200 (${medCount} medicines)\n`);
  } else {
    results.push({ name: 'Medicine List', status: 'FAIL', code: medListRes.status });
    console.log(`   ❌ FAIL - Status: ${medListRes.status}\n`);
  }

  // 3. MEDICINE SEARCH
  console.log('3. GET /medicines/search?query=त्रिफला');
  const searchRes = await makeRequest('GET', '/medicines/search?query=त्रिफला', null, true);
  const searchCount = searchRes.data?.data?.medicines?.length || 0;
  if (searchRes.status === 200 && searchRes.data.success) {
    results.push({ name: 'Medicine Search', status: 'PASS', code: 200, detail: `${searchCount} results` });
    console.log(`   ✅ PASS - Status: 200 (${searchCount} results)\n`);
  } else {
    results.push({ name: 'Medicine Search', status: 'FAIL', code: searchRes.status });
    console.log(`   ❌ FAIL - Status: ${searchRes.status}\n`);
  }

  // 4. DROPDOWN LIST
  console.log('4. GET /dropdowns/list');
  const dropdownsRes = await makeRequest('GET', '/dropdowns/list', null, true);
  const dropCount = dropdownsRes.data?.data?.categories?.length || 0;
  if (dropdownsRes.status === 200 && dropdownsRes.data.success) {
    results.push({ name: 'Dropdown List', status: 'PASS', code: 200, detail: `${dropCount} categories` });
    console.log(`   ✅ PASS - Status: 200 (${dropCount} categories)\n`);
  } else {
    results.push({ name: 'Dropdown List', status: 'FAIL', code: dropdownsRes.status });
    console.log(`   ❌ FAIL - Status: ${dropdownsRes.status}\n`);
  }

  // 5. DROPDOWN OPTIONS
  console.log('5. GET /dropdowns/purvrut/options');
  const optionsRes = await makeRequest('GET', '/dropdowns/purvrut/options', null, true);
  const optCount = optionsRes.data?.data?.options?.length || 0;
  if (optionsRes.status === 200 && optionsRes.data.success) {
    results.push({ name: 'Dropdown Options', status: 'PASS', code: 200, detail: `${optCount} options` });
    console.log(`   ✅ PASS - Status: 200 (${optCount} options)\n`);
  } else {
    results.push({ name: 'Dropdown Options', status: 'FAIL', code: optionsRes.status });
    console.log(`   ❌ FAIL - Status: ${optionsRes.status}\n`);
  }

  // SUMMARY
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${total - passed} ❌`);
  console.log(`Success Rate: ${Math.round((passed/total)*100)}%\n`);
  
  console.log('Test Results:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    const detail = r.detail ? ` - ${r.detail}` : '';
    console.log(`  ${icon} ${r.name}: ${r.status}${detail}`);
  });
  
  console.log('\n╚════════════════════════════════════════════════════════╝\n');
return results;
}

runFinalTests().catch(console.error);
