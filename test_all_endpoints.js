const fs = require('fs');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function request(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => null);

  if (res.status >= 400) {
    console.warn(`[failed] ${method} ${path} - Status ${res.status}`);
    console.warn(`[failed details]`, JSON.stringify(data, null, 2));
    return { status: res.status, error: data };
  }
  
  console.log(`[ok] ${method} ${path}`);
  return { status: res.status, data: data?.data || data };
}

async function login(email, password) {
  const res = await request('/auth/login', 'POST', { email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}`);
  console.log(`[login] Token retrieved for ${email}:`, res.data.idToken ? 'YES (length: ' + res.data.idToken.length + ')' : 'NO', res.data);
  return res.data.idToken;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Comprehensive API Tests ---');
  let saToken, haToken, drToken, recToken;
  let hospitalId, branchId, doctorId, recId;
  let patientId, consultationId, prescriptionId;
  let planId, sessionId, tokenId, billId, itemId;

  try {
    // ==========================================
    // 1. AUTHENTICATION & SETUP
    // ==========================================
    console.log('\\n--- Module 1: Auth & Setup ---');
    saToken = await login('superadmin@ayurmedi.test', 'SuperAdminPassword@123');

    // Register Hospital
    const hEmail = `admin-${Date.now()}@test.com`;
    let res = await request('/hospitals/register', 'POST', {
      hospital_code: `HC-${Date.now()}`,
      name: 'API Test Hospital',
      type: 'AYURVEDIC',
      admin_email: hEmail,
      admin_password: 'Password@123',
      admin_full_name: 'Test Admin',
      contact_number: '9999999999',
      address: 'Test City'
    }, saToken);
    assert(res.status === 200, 'Hospital registration');
    hospitalId = res.data.hospital.hospital_id;

    // List Hospitals
    res = await request('/hospitals', 'GET', null, saToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List Hospitals');

    // Get Hospital
    res = await request(`/hospitals/${hospitalId}`, 'GET', null, saToken);
    assert(res.status === 200, 'Get Hospital');

    haToken = await login(hEmail, 'Password@123');

    // ==========================================
    // 2. BRANCHES
    // ==========================================
    console.log('\\n--- Module 2: Branches ---');
    res = await request(`/hospitals/${hospitalId}/branches`, 'POST', {
      name: 'North Branch', address: 'North City', contact_number: '8888888888', email: 'north@test.com'
    }, haToken);
    assert(res.status === 201, 'Create Branch');
    branchId = res.data.branch_id;

    res = await request(`/hospitals/${hospitalId}/branches`, 'GET', null, haToken);
    assert(res.status === 200 && res.data.length > 0, 'List Branches');

    res = await request(`/branches/${branchId}`, 'PUT', { name: 'North Branch Updated' }, haToken);
    assert(res.status === 200, 'Update Branch');

    // ==========================================
    // 3. USERS (STAFF)
    // ==========================================
    console.log('\\n--- Module 3: Users ---');
    const dEmail = `doc-${Date.now()}@test.com`;
    res = await request('/users', 'POST', {
      hospital_id: hospitalId, email: dEmail, full_name: 'Dr. Test', role: 'DOCTOR', password: 'Password@123'
    }, haToken);
    assert(res.status === 201, 'Create Doctor user');
    doctorId = res.data.user_id;

    const rEmail = `rec-${Date.now()}@test.com`;
    res = await request('/users', 'POST', {
      hospital_id: hospitalId, email: rEmail, full_name: 'Rec Test', role: 'RECEPTION', password: 'Password@123'
    }, haToken);
    recId = res.data.user_id;

    res = await request('/users', 'GET', null, haToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List users');

    res = await request(`/users/${doctorId}`, 'GET', null, haToken);
    assert(res.status === 200, 'Get user details');

    res = await request(`/users/${doctorId}`, 'PUT', { full_name: 'Dr. Test Updated' }, haToken);
    assert(res.status === 200, 'Update user');

    drToken = await login(dEmail, 'Password@123');
    recToken = await login(rEmail, 'Password@123');

    // ==========================================
    // 4. FORM CONFIGS
    // ==========================================
    console.log('\\n--- Module 4: Form Configs ---');
    res = await request('/forms/config/PATIENT_INTAKE', 'PUT', {
      hospital_id: hospitalId, fields: [{ id: 'test_field', label: 'Test', type: 'text' }]
    }, haToken);
    assert(res.status === 200, 'Save form config');

    res = await request('/forms/config/PATIENT_INTAKE', 'GET', null, recToken);
    assert(res.status === 200, 'Get form config');

    res = await request('/forms/config', 'GET', null, recToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List all form configs');

    // ==========================================
    // 5. PATIENTS
    // ==========================================
    console.log('\\n--- Module 5: Patients ---');
    res = await request('/patients', 'POST', {
      hospital_id: hospitalId, name: 'John Doe', mobile: '9988776655', age: 40, gender: 'M'
    }, recToken);
    assert(res.status === 201, 'Create Patient');
    patientId = res.data.patient_id;

    res = await request('/patients', 'GET', null, recToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List patients');

    res = await request(`/patients/${patientId}`, 'GET', null, drToken);
    assert(res.status === 200, 'Get specific patient');

    res = await request(`/patients/${patientId}`, 'PUT', { age: 41 }, recToken);
    assert(res.status === 200, 'Update patient age');

    res = await request('/patients/search?q=John', 'GET', null, recToken);
    assert(res.status === 200 && res.data.length > 0, 'Search patients');

    // ==========================================
    // 6. TOKENS / QUEUE
    // ==========================================
    console.log('\\n--- Module 6: Tokens ---');
    res = await request('/tokens', 'POST', {
      hospital_id: hospitalId, doctor_id: doctorId, patient_id: patientId
    }, recToken);
    assert(res.status === 201, 'Create Token');
    tokenId = res.data.token_id;

    res = await request(`/tokens/queue?hospital_id=${hospitalId}&doctor_id=${doctorId}`, 'GET', null, recToken);
    assert(res.status === 200, 'Get Token Queue');

    res = await request(`/tokens/display?hospital_id=${hospitalId}&doctor_id=${doctorId}`, 'GET', null, null);
    assert(res.status === 200, 'Get Token Display (public)');

    res = await request(`/tokens/${tokenId}/status`, 'PUT', { status: 'IN_CONSULT' }, drToken);
    assert(res.status === 200, 'Update token status to IN_CONSULT');

    // ==========================================
    // 7. CONSULTATION
    // ==========================================
    console.log('\\n--- Module 7: Consultations ---');
    res = await request('/consultations', 'POST', {
      hospital_id: hospitalId, patient_id: patientId, doctor_id: doctorId,
      chief_complaints: 'Headache', diagnosis: 'Migraine'
    }, drToken);
    assert(res.status === 201, 'Create Consultation');
    consultationId = res.data.consultation_id;

    res = await request(`/consultations/${consultationId}`, 'GET', null, drToken);
    assert(res.status === 200, 'Get Consultation');

    res = await request(`/consultations/${consultationId}`, 'PUT', { diagnosis: 'Severe Migraine' }, drToken);
    assert(res.status === 200, 'Update Consultation');

    res = await request(`/patients/${patientId}/consultations`, 'GET', null, drToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List patient consultations');

    // ==========================================
    // 8. INVENTORY
    // ==========================================
    console.log('\\n--- Module 8: Inventory ---');
    res = await request('/inventory/items', 'POST', {
      hospital_id: hospitalId, name: 'Test Medicine ' + Date.now(), category: 'CLASSICAL', unit: 'tabs'
    }, haToken);
    assert(res.status === 201, 'Create item');
    itemId = res.data.item_id;

    res = await request('/inventory/items', 'GET', null, haToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List items');

    res = await request(`/inventory/items/${itemId}`, 'GET', null, haToken);
    assert(res.status === 200, 'Get item');

    res = await request(`/inventory/items/${itemId}`, 'PUT', { selling_price: 15 }, haToken);
    assert(res.status === 200, 'Update item');

    res = await request('/inventory/stock-in', 'POST', {
      hospital_id: hospitalId, item_id: itemId, quantity_added: 50, batch_number: 'B1', expiry_date: '2030-01-01'
    }, haToken);
    assert(res.status === 200, 'Stock-in item');
    
    res = await request('/inventory/stock-adjust', 'POST', {
      hospital_id: hospitalId, item_id: itemId, quantity_adjusted: -5, reason: 'WASTAGE'
    }, haToken);
    assert(res.status === 200, 'Stock-adjust item');

    res = await request('/inventory/alerts/low-stock?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Low stock alerts');

    res = await request('/inventory/alerts/expiry?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Expiry alerts');

    // ==========================================
    // 9. PRESCRIPTION
    // ==========================================
    console.log('\\n--- Module 9: Prescriptions ---');
    res = await request('/prescriptions', 'POST', {
      hospital_id: hospitalId, patient_id: patientId, consultation_id: consultationId, doctor_id: doctorId,
      medicines: [{ item_id: itemId, name: 'Test Med', dosage: '1', frequency: '1-0-1', timing: 'AFTER_MEAL', duration_days: 5 }]
    }, drToken);
    assert(res.status === 201, 'Create Prescription');
    prescriptionId = res.data.prescription_id;

    res = await request(`/prescriptions/${prescriptionId}`, 'GET', null, drToken);
    assert(res.status === 200, 'Get Prescription');

    res = await request(`/patients/${patientId}/prescriptions`, 'GET', null, drToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List patient prescriptions');

    // ==========================================
    // 10. PANCHAKARMA
    // ==========================================
    console.log('\\n--- Module 10: Panchakarma ---');
    res = await request('/panchakarma/plans', 'POST', {
      hospital_id: hospitalId, patient_id: patientId, doctor_id: doctorId, therapy_type: 'BASTI', total_sessions_planned: 5
    }, drToken);
    assert(res.status === 201, 'Create PK Plan');
    planId = res.data.plan_id;

    res = await request(`/panchakarma/plans/${planId}`, 'GET', null, drToken);
    assert(res.status === 200, 'Get PK Plan');

    res = await request(`/patients/${patientId}/panchakarma`, 'GET', null, drToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List patient PK plans');

    res = await request(`/panchakarma/plans/${planId}/sessions`, 'POST', {
      therapist_id: doctorId, scheduled_date: '2026-03-20', duration_minutes: 45
    }, drToken);
    assert(res.status === 201, 'Create PK Session');
    sessionId = res.data.session_id;

    res = await request(`/panchakarma/plans/${planId}/sessions`, 'GET', null, drToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List PK sessions');

    res = await request(`/panchakarma/sessions/${sessionId}`, 'PUT', { plan_id: planId, status: 'COMPLETED' }, drToken);
    assert(res.status === 200, 'Update PK Session status');

    // Complete token after clinical flow
    res = await request(`/tokens/${tokenId}/status`, 'PUT', { status: 'COMPLETED' }, drToken);

    // ==========================================
    // 11. BILLING
    // ==========================================
    console.log('\\n--- Module 11: Billing ---');
    res = await request('/billing', 'POST', {
      hospital_id: hospitalId, patient_id: patientId, 
      items: [{ description: 'Consultation Fee', type: 'FEE', amount: 500, quantity: 1, total: 500 }],
      subtotal: 500, tax_amount: 0, total_amount: 500, payment_status: 'PARTIAL', amount_paid: 200
    }, recToken);
    assert(res.status === 201, 'Create Bill');
    billId = res.data.bill_id;

    res = await request(`/billing/${billId}`, 'GET', null, recToken);
    assert(res.status === 200, 'Get Bill');

    res = await request(`/billing/${billId}/payment`, 'PUT', {
      amount: 300, payment_mode: 'UPI', transaction_id: 'TX123'
    }, recToken);
    assert(res.status === 200, 'Record Payment');

    res = await request(`/patients/${patientId}/bills`, 'GET', null, recToken);
    assert(res.status === 200 && Array.isArray(res.data), 'List patient bills');

    // ==========================================
    // 12. REPORTS & DASHBOARD
    // ==========================================
    console.log('\\n--- Module 12: Reports & Dashboard ---');
    // For reports, some GET paths require ?hospital_id= parameter
    res = await request('/reports/daily-opd?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Daily OPD Report');

    res = await request('/reports/revenue?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Revenue Report');

    res = await request('/reports/inventory-usage?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Inventory Usage Report');

    res = await request('/reports/low-stock?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Low Stock Report');

    res = await request(`/patients/${patientId}/report?hospital_id=${hospitalId}`, 'GET', null, haToken);
    assert(res.status === 200, 'Patient Report');

    res = await request('/dashboard/summary?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Dashboard Summary');

    res = await request('/dashboard/analytics?hospital_id=' + hospitalId, 'GET', null, haToken);
    assert(res.status === 200, 'Dashboard Analytics');

    console.log('\\nALL ENDPOINTS TESTED SUCCESSFULLY! ✅');

  } catch (error) {
    console.error('\\n❌ TEST FAILED:', error.message);
  }
}

runTests();
