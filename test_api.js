const API_URL = 'https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com';

async function runTests() {
  console.log(`Starting smoke tests against: ${API_URL}`);
  let token = '';
  
  try {
    console.log('\n--- 1. Login as Super Admin ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@ayurmedi.test',
        password: 'SuperAdminPassword@123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Status:', loginRes.status);
    
    if (loginRes.status !== 200) {
      console.log('Response:', JSON.stringify(loginData, null, 2));
      console.error('Login failed, aborting further tests.');
      return;
    }
    
    console.log('Returned Token Object Keys:', Object.keys(loginData.data));
    token = loginData.data.idToken;

    console.log('\n--- 2. Register Hospital ---');
    const hospitalCode = `HOSP-${Date.now()}`;
    const registerRes = await fetch(`${API_URL}/hospitals/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        hospital_code: hospitalCode,
        name: 'Smoke Test Ayurveda Center',
        type: 'AYURVEDIC',
        admin_email: `admin.${Date.now()}@ayurmedi.test`,
        admin_password: 'TestPassword@123',
        admin_full_name: 'Dr. Test Admin'
      })
    });
    const registerData = await registerRes.json();
    console.log('Status:', registerRes.status);
    
    if (registerRes.status !== 200) {
      console.log('Response:', JSON.stringify(registerData, null, 2));
      console.error('Registration failed, aborting further tests.');
      return;
    }
    console.log('Successfully registered hospital:', hospitalCode);
    const hospitalId = registerData.data.hospital.hospital_id;

    console.log('\n--- 3. List Hospitals ---');
    const listRes = await fetch(`${API_URL}/hospitals`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', listRes.status);
    if (listRes.status === 200) {
      const listData = await listRes.json();
      console.log(`Successfully listed ${listData.data.length} hospitals`);
    }

    console.log('\n--- 4. Patient Creation (Expected 403 Forbidden since we are Super Admin) ---');
    const patientRes = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        hospital_id: hospitalId,
        name: 'Test Patient',
        mobile: '9999999999',
        age: 30,
        gender: 'M'
      })
    });
    console.log('Status:', patientRes.status, patientRes.status === 403 ? '(Correctly rejected non-clinical staff)' : '(Super Admin is allowed to create patients)');
    if (patientRes.status !== 201) {
       console.log('Response:', await patientRes.text());
    }

  } catch (err) {
    console.error('Test script error:', err);
  }
}

runTests();
