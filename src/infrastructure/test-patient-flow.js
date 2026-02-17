require('dotenv').config();
const https = require('https');
const crypto = require('crypto');

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
          // Attempt to parse JSON
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          // Fallback to raw body if not JSON
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function generateMobile() {
  return '9' + Math.floor(100000000 + Math.random() * 900000000);
}

async function testPatientFlow() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     PATIENT FLOW SYSTEM - INTEGRATION TES T           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. LOGIN
  console.log('🔹 1. Login as Admin/Doctor...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'admin@ayurmedi.com',
    password: 'Admin@2026',
  });
  
  if (loginRes.status === 200 && loginRes.data.success) {
    authToken = loginRes.data.data.accessToken;
    console.log('   ✅ Login successful');
  } else {
    console.log('   ❌ Login failed:', loginRes.data);
    return;
  }

  // 2. REGISTER PATIENT
  const newMobile = generateMobile();
  console.log(`\n🔹 2. Register Patient (Mobile: ${newMobile})...`);
  const regRes = await makeRequest('POST', '/patients/register', {
    full_name: 'Test Patient ' + newMobile,
    mobile: newMobile,
    gender: 'Male',
    dob: '1990-01-01',
    address: '123 Test St, Pune'
  }, true);

  let patientId;
  if (regRes.status === 200 && regRes.data.success) {
    patientId = regRes.data.data.patient?.patient_id;
    console.log(`   ✅ Patient registered: ${patientId}`);
  } else {
    console.log('   ❌ Registration failed:', regRes.data);
    return;
  }

  // 3. SEARCH PATIENT
  console.log('\n🔹 3. Search Patient by Mobile...');
  const searchRes = await makeRequest('GET', `/patients/search?mobile=${newMobile}`, null, true);
  if (searchRes.status === 200 && searchRes.data.success && searchRes.data.data.patients.length > 0) {
    console.log('   ✅ Patient found via search');
  } else {
    console.log('   ❌ Patient search failed:', searchRes.data);
  }

  // 4. CREATE VISIT
  console.log('\n🔹 4. Create Visit...');
  const visitRes = await makeRequest('POST', '/visits/create', {
    patient_id: patientId,
    visit_date: new Date().toISOString().split('T')[0],
    weight: 75,
    current_illness: 'Fever and Cough'
  }, true);

  let visitId;
  if (visitRes.status === 200 && visitRes.data.success) {
    visitId = visitRes.data.data.visit?.visit_id;
    const stage = visitRes.data.data.visit?.stage;
    console.log(`   ✅ Visit created: ${visitId}`);
    console.log(`      Stage: ${stage} (Expected: WAITING_FOR_HISTORY)`);
    if (stage !== 'WAITING_FOR_HISTORY') console.log('      ⚠️  Unexpected stage!');
  } else {
    console.log('   ❌ Create visit failed:', visitRes.data);
    return;
  }

  // 5. CHECK QUEUE (WAITING_FOR_HISTORY)
  console.log('\n🔹 5. Check Queue (WAITING_FOR_HISTORY)...');
  const q1Res = await makeRequest('GET', '/visits/queue?stage=WAITING_FOR_HISTORY', null, true);
  if (q1Res.status === 200 && q1Res.data.success) {
    const inQueue = q1Res.data.data.visits.some(v => v.visit_id === visitId);
    if (inQueue) console.log('   ✅ Visit found in queue');
    else console.log('   ⚠️  Visit NOT found in queue');
  } else {
    console.log('   ❌ Queue check failed:', q1Res.data);
  }

  // 6. ADD HISTORY
  console.log('\n🔹 6. Add Patient History...');
  const histRes = await makeRequest('POST', `/visits/${visitId}/history`, {
    purvrut: ['Diabetes', 'Hypertension'],
    artava: 'N/A',
    bowel: 'Regular',
    appetite: 'Good'
  }, true);

  if (histRes.status === 200 && histRes.data.success) {
    console.log('   ✅ History added successfully');
  } else {
    console.log('   ❌ Add history failed:', histRes.data);
    return;
  }

  // 7. CHECK QUEUE (READY_FOR_DOCTOR)
  console.log('\n🔹 7. Check Queue (READY_FOR_DOCTOR)...');
  const q2Res = await makeRequest('GET', '/visits/queue?stage=READY_FOR_DOCTOR', null, true);
  if (q2Res.status === 200 && q2Res.data.success) {
    const inQueue = q2Res.data.data.visits.some(v => v.visit_id === visitId);
    if (inQueue) {
        console.log('   ✅ Visit moved to READY_FOR_DOCTOR queue');
    } else {
        console.log('   ⚠️  Visit NOT found in READY_FOR_DOCTOR queue');
    }
  } else {
    console.log('   ❌ Queue check failed:', q2Res.data);
  }

  // 8. ADD PRESCRIPTION
  console.log('\n🔹 8. Create Prescription...');
  const prescRes = await makeRequest('POST', `/visits/${visitId}/prescription`, {
    notes: 'Take rest and drink warm water',
    follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }, true);

  let prescriptionId;
  if (prescRes.status === 200 && prescRes.data.success) {
    prescriptionId = prescRes.data.data.prescription?.prescription_id;
    console.log(`   ✅ Prescription created: ${prescriptionId}`);
  } else {
    console.log('   ❌ Create prescription failed:', prescRes.data);
    return;
  }

  // 9. ADD PRESCRIPTION ITEMS
  console.log('\n🔹 9. Add Medicines to Prescription...');
  // Need a medicine ID first - let's search for one or just use a dummy one if validation allows
  // But wait, the system doesn't validate existence of medicine_id in other tables rigidly in dynamo unless we coded it. 
  // Let's first search for a medicine to get a real ID.
  const medSearch = await makeRequest('GET', '/medicines/search?q=a', null, true);
  let medicineId = 'med-123'; // fallback
  if (medSearch.status === 200 && medSearch.data.data?.medicines?.length > 0) {
    medicineId = medSearch.data.data.medicines[0].medicine_id;
  }

  const itemRes = await makeRequest('POST', `/prescriptions/${prescriptionId}/items`, {
    medicine_id: medicineId,
    dose: '1-0-1',
    timing: 'After Food',
    duration_days: 5,
    quantity: 10
  }, true);

  if (itemRes.status === 200 && itemRes.data.success) {
    console.log('   ✅ Medicine added to prescription');
  } else {
    console.log('   ❌ Add medicine failed:', itemRes.data);
  }

  // 10. CHECK QUEUE (READY_FOR_BILLING)
  console.log('\n🔹 10. Check Queue (READY_FOR_BILLING)...');
  const q3Res = await makeRequest('GET', '/visits/queue?stage=READY_FOR_BILLING', null, true);
  if (q3Res.status === 200 && q3Res.data.success) {
    const inQueue = q3Res.data.data.visits.some(v => v.visit_id === visitId);
    if (inQueue) {
        console.log('   ✅ Visit moved to READY_FOR_BILLING queue');
    } else {
        console.log('   ⚠️  Visit NOT found in READY_FOR_BILLING queue');
    }
  } else {
    console.log('   ❌ Queue check failed:', q3Res.data);
  }

  // 11. GET FULL SUMMARY
  console.log('\n🔹 11. Get Full Visit Summary...');
  const summaryRes = await makeRequest('GET', `/visits/${visitId}/summary`, null, true);
  if (summaryRes.status === 200 && summaryRes.data.success) {
    const s = summaryRes.data.data;
    if (s.patient && s.visit && s.history && s.prescription && s.items.length > 0) {
      console.log('   ✅ Full summary retrieved correctly');
      console.log(`      - Patient: ${s.patient.full_name}`);
      console.log(`      - History: ${JSON.stringify(s.history).substring(0, 50)}...`);
      console.log(`      - Prescription Items: ${s.items.length}`);
    } else {
      console.log('   ⚠️  Summary missing some parts:', Object.keys(s));
    }
  } else {
    console.log('   ❌ Get summary failed:', summaryRes.data);
  }

  // 12. COMPLETE VISIT
  console.log('\n🔹 12. Complete Visit...');
  const compRes = await makeRequest('PATCH', `/visits/${visitId}/complete`, {}, true);
  if (compRes.status === 200 && compRes.data.success) {
      console.log('   ✅ Visit marked as COMPLETED');
      console.log(`      Status: ${compRes.data.data.visit.status}`);
  } else {
      console.log('   ❌ Complete visit failed:', compRes.data);
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  TESTING COMPLETE                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

testPatientFlow().catch(console.error);
