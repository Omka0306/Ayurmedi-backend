require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://m6y68bub70.execute-api.ap-south-1.amazonaws.com';

async function testDropdownCategories() {
  // First login to get token
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'admin@ayurmedi.com',
    password: 'Admin@2026',
  });
  
  console.log('Login:', loginRes.status, loginRes.data.success ? '✅' : '❌');
  
  if (!loginRes.data.success) {
    console.error('Login failed:', loginRes.data);
    return;
  }
  
  const token = loginRes.data.data.accessToken;
  
  // Test dropdown list
  console.log('\n=== Testing GET /dropdowns/list ===');
  const dropdownsRes = await makeRequest('GET', '/dropdowns/list', null, token);
  console.log('Status:', dropdownsRes.status);
  console.log('Response:', JSON.stringify(dropdownsRes.data, null, 2));
}

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
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

testDropdownCategories().catch(console.error);
