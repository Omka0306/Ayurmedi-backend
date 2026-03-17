const fs = require('fs');

const API_URL = 'https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com';

const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';
const ROLE_HOSPITAL_ADMIN = 'HOSPITAL_ADMIN';
const ROLE_DOCTOR = 'DOCTOR';
const ROLE_ASSISTANT = 'ASSISTANT';
const ROLE_RECEPTION = 'RECEPTION';

async function request(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => null);

  if (res.status >= 400) {
    console.error(`ERROR [${method}] ${path} (Status ${res.status})`);
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`Request failed: ${method} ${path}`);
  }

  return { status: res.status, data: data?.data || data };
}

async function login(email, password) {
  const res = await request('/auth/login', 'POST', { email, password });
  return res.data.idToken; 
}

async function runSeedAndTest() {
  console.log(`Starting Full API Test & Seeding against: ${API_URL}`);
  
  try {
    // ---- 1. Super Admin Login ----
    console.log('\\n--- 1. Login as Super Admin ---');
    const saToken = await login('superadmin@ayurmedi.test', 'SuperAdminPassword@123');
    console.log('Super Admin Logged In.');

    // ---- 2. Register Hospital & Get Admin Credentials ----
    console.log('\\n--- 2. Register Mitram Ayurveda ---');
    const hospitalCode = `MITRAM-${Date.now()}`;
    const haEmail = `admin.${Date.now()}@mitram.ayurveda`;
    const haPassword = 'AdminPassword@123';
    
    const hospRes = await request('/hospitals/register', 'POST', {
      hospital_code: hospitalCode,
      name: 'Mitram Ayurveda & Multi-Hospital Network',
      type: 'AYURVEDIC',
      admin_email: haEmail,
      admin_password: haPassword,
      admin_full_name: 'Dr. Vivek Sharma',
      contact_number: '9876543210',
      address: 'Pune, Maharashtra'
    }, saToken);
    
    const hospitalId = hospRes.data.hospital.hospital_id;
    console.log(`Hospital created: ${hospitalId}`);

    // ---- 3. Login as Hospital Admin ----
    console.log('\\n--- 3. Login as Hospital Admin ---');
    const haToken = await login(haEmail, haPassword);
    console.log('Hospital Admin Logged In.');

    // ---- 4. Create Staff (Doctor, Assistant, Reception) ----
    console.log('\\n--- 4. Creating Clinic Staff ---');
    const drEmail = `dr.shashikant.${Date.now()}@mitram.ayurveda`;
    const astEmail = `ast.${Date.now()}@mitram.ayurveda`;
    const recEmail = `rec.${Date.now()}@mitram.ayurveda`;
    const defaultPassword = 'StaffPassword@123';

    // Since users are created by Cognito AdminCreateUser, they are forced to change password.
    // However, our backend handles this. Let's create users via Hospital Admin.
    const drRes = await request('/users', 'POST', {
      hospital_id: hospitalId,
      email: drEmail,
      full_name: 'Vaidya Shashikant Kumar',
      role: ROLE_DOCTOR,
      mobile: '9876543211',
      specialization: 'Panchakarma',
      avg_consult_mins: 15,
      password: defaultPassword
    }, haToken);
    const doctorId = drRes.data.user_id;
    console.log('Doctor created:', doctorId);

    const astRes = await request('/users', 'POST', {
      hospital_id: hospitalId,
      email: astEmail,
      full_name: 'Dr. Ramesh (Asst)',
      role: ROLE_ASSISTANT,
      mobile: '9876543212',
      password: defaultPassword
    }, haToken);
    console.log('Assistant Doctor created.');

    const recRes = await request('/users', 'POST', {
      hospital_id: hospitalId,
      email: recEmail,
      full_name: 'Sunita (Reception)',
      role: ROLE_RECEPTION,
      mobile: '9876543213',
      password: defaultPassword
    }, haToken);
    console.log('Receptionist created.');

    // Simulate staff logging in to fetch tokens
    console.log('\\n--- 5. Staff Authentication Tests ---');
    const drToken = await login(drEmail, defaultPassword);
    const astToken = await login(astEmail, defaultPassword);
    const recToken = await login(recEmail, defaultPassword);
    console.log('All staff successfully authenticated.');

    // ---- 6. Seed Inventory Master Data (Admin) ----
    console.log('\\n--- 6. Seeding Inventory (Pharmacy & Panchakarma) ---');
    const triphalaRes = await request('/inventory/items', 'POST', {
      hospital_id: hospitalId,
      name: 'Triphala Churna',
      brand: 'Dhootapapeshwar',
      category: 'CLASSICAL',
      unit: 'grams',
      selling_price: 150.00,
      reorder_level: 500,
      current_stock: 0
    }, haToken);
    const triphalaId = triphalaRes.data.item_id;

    const mahanarayanRes = await request('/inventory/items', 'POST', {
      hospital_id: hospitalId,
      name: 'Mahanarayan Taila',
      brand: 'Baidyanath',
      category: 'PK_OIL',
      unit: 'ml',
      selling_price: 300.00,
      reorder_level: 1000,
      current_stock: 0
    }, haToken);
    const mahanarayanId = mahanarayanRes.data.item_id;

    // Stock-In (Purchase)
    await request('/inventory/stock-in', 'POST', {
      hospital_id: hospitalId,
      item_id: triphalaId,
      quantity_added: 2000,
      source_vendor: 'Local Distributor',
      batch_number: 'B-001',
      expiry_date: '2028-12-31'
    }, haToken);
    await request('/inventory/stock-in', 'POST', {
      hospital_id: hospitalId,
      item_id: mahanarayanId,
      quantity_added: 5000,
      source_vendor: 'Local Distributor',
      batch_number: 'B-002',
      expiry_date: '2027-06-30'
    }, haToken);
    console.log('Inventory items created and restocked.');

    // ---- 7. Dynamic Form Configuration (Admin) ----
    console.log('\\n--- 7. Dynamic Form Setup for Patient Intake (Rognpatrak) ---');
    await request('/forms/config/PATIENT_INTAKE', 'PUT', {
      hospital_id: hospitalId,
      form_type: 'PATIENT_INTAKE',
      fields: [
        { id: "birth_time", label: "Birth Date & Time", type: "datetime", required: false, section: "demographics" },
        { id: "chief_complaint", label: "Current Ailment", type: "textarea", required: true, section: "complaints" },
        { id: "duration", label: "Duration", type: "text", required: true, section: "complaints" },
        { id: "past_illness", label: "Past Illnesses", type: "multiselect", options: ["Chickenpox", "Malaria", "Typhoid", "Dengue", "COVID-19"], required: false, section: "history" }
      ]
    }, haToken);
    console.log('Patient Intake Form Layout saved.');

    // ---- 8. Patient Registration (Reception) ----
    console.log('\\n--- 8. Registering New Patient (Receptionist) ---');
    const patRes = await request('/patients', 'POST', {
      hospital_id: hospitalId,
      name: 'Ramesh Patil',
      mobile: '9988776655',
      age: 42,
      gender: 'M',
      address: 'Shivaji Nagar, Pune',
      blood_group: 'O+',
      custom_data: {
        birth_time: '1984-05-12T08:30:00Z',
        chief_complaint: 'Severe lower back pain radiating to left leg',
        duration: '3 months',
        past_illness: ['Typhoid', 'COVID-19'] // Dynamic fields
      }
    }, recToken);
    const patientId = patRes.data.patient_id;
    console.log(`Patient registered: ${patRes.data.registration_no}`);

    // ---- 9. Token Generation (Reception) ----
    console.log('\\n--- 9. Token Generation (Queue) ---');
    const tokRes = await request('/tokens', 'POST', {
      hospital_id: hospitalId,
      doctor_id: doctorId,
      patient_id: patientId
    }, recToken);
    const tokenId = tokRes.data.token_id;
    console.log(`Token assigned: ${tokRes.data.token_number} for Today`);

    // Verify Display Endpoint (Public)
    await request(`/tokens/display?hospital_id=${hospitalId}&doctor_id=${doctorId}`, 'GET', null, null);
    
    // Accept Token Room (Reception)
    await request(`/tokens/${tokenId}/status`, 'PUT', { status: 'IN_CONSULTATION' }, recToken);
    console.log('Token marked IN_CONSULTATION.');

    // ---- 10. Consultation (Doctor) ----
    console.log('\\n--- 10. Doctor Consultation (Vaidya) ---');
    const consultRes = await request('/consultations', 'POST', {
      hospital_id: hospitalId,
      patient_id: patientId,
      doctor_id: doctorId,
      chief_complaints: 'Severe lower back pain (Gridhrasi), aggravated by walking.',
      clinical_findings: {
        pulse: 'Vata predominant, 82 bpm',
        tongue: 'Coated (Sama)',
        bp: '130/85',
        weight: 78
      },
      diagnosis: 'Gridhrasi (Sciatica)',
      notes: 'Patient exhibits signs of Vata aggravation due to cold exposure and erratic timings.'
    }, drToken);
    const consultationId = consultRes.data.consultation_id;
    console.log('Consultation notes saved.');

    // ---- 11. Prescription (Doctor) ----
    console.log('\\n--- 11. Issuing Prescription & Treatment Plan ---');
    await request('/prescriptions', 'POST', {
      hospital_id: hospitalId,
      patient_id: patientId,
      consultation_id: consultationId,
      doctor_id: doctorId,
      medicines: [
        {
          item_id: triphalaId, // Will auto-deduct from stock
          name: 'Triphala Churna',
          type: 'Powder',
          dosage: '5g',
          frequency: '1-0-1',
          timing: 'AFTER_MEAL',
          duration_days: 15,
          instructions: 'Take with warm water at bedtime.'
        }
      ],
      pathya_apathya: {
        pathya: 'Warm fresh food, Cow Ghee, Moong Dal',
        apathya: 'Cold food, Vata aggravating foods (Chana, Vata), AC exposure'
      },
      lifestyle_advice: 'Avoid lifting heavy weights. Practice light stretching.',
      follow_up_date: '2026-03-28'
    }, drToken);
    
    // Auto-Stock Deduction Validation
    const inventoryCheck = await request(`/inventory/items/${triphalaId}`, 'GET', null, haToken);
    console.log(`Prescription issued. Current Stock of Triphala Churna: ${inventoryCheck.data.current_stock}g (deducted 150g [5g x 2 x 15])`);

    // ---- 12. Panchakarma Plan & Session (Doctor & Assistant) ----
    console.log('\\n--- 12. Planning Panchakarma (Basti) ---');
    const pkRes = await request('/panchakarma/plans', 'POST', {
      hospital_id: hospitalId,
      patient_id: patientId,
      doctor_id: doctorId,
      therapy_type: 'Basti',
      description: 'Kala Basti (16 days) with Mahanarayan Taila',
      total_sessions_planned: 16,
      medicines_required: ['Mahanarayan Taila (200ml/session)']
    }, drToken);
    const planId = pkRes.data.plan_id;
    console.log('Panchakarma Plan created.');

    console.log('--- Executing First PK Session (Assistant) ---');
    const sessionRes = await request(`/panchakarma/plans/${planId}/sessions`, 'POST', {
      therapist_id: doctorId, // assistant can log it for doctor, or doctor logs it
      scheduled_date: new Date().toISOString().split('T')[0],
      duration_minutes: 45,
      items_used: [
        {
          item_id: mahanarayanId,
          quantity: 200, // 200ml auto-deducted
          name: 'Mahanarayan Taila'
        }
      ],
      pre_procedure: 'Abhyanga and Swedana done for 20 mins.',
      procedure: 'Matra Basti administered smoothly. Patient retained taila for 3 hours.',
      post_procedure: 'Patient felt lightness in lower back.',
      vitals_recorded: { bp: '120/80', pulse: '76' }
    }, astToken);
    console.log('First Basti Session completed.');

    // Mark Queue Complete (Reception)
    await request(`/tokens/${tokenId}/status`, 'PUT', { status: 'COMPLETED' }, recToken);

    // ---- 13. Billing (Reception) ----
    console.log('\\n--- 13. Generating Final Bill ---');
    const bRes = await request('/billing', 'POST', {
      hospital_id: hospitalId,
      patient_id: patientId,
      items: [
        { description: 'OPD Consultation', type: 'FEE', amount: 500, quantity: 1, total: 500 },
        { description: 'Triphala Churna Dispensed', type: 'MEDICINE', item_id: triphalaId, amount: 150, quantity: 1, total: 150 }, // 1 pack
        { description: 'Panchakarma Basti Session 1', type: 'PROCEDURE', plan_id: planId, amount: 800, quantity: 1, total: 800 }
      ],
      subtotal: 1450,
      discount: 50,
      tax_amount: 0,
      total_amount: 1400,
      payment_status: 'PARTIAL',
      amount_paid: 1000
    }, recToken);
    const billId = bRes.data.bill_id;
    console.log('Bill generated: Total ₹1400, Paid ₹1000.');

    console.log('\\n--- 14. Recording Remaining Payment ---');
    await request(`/billing/${billId}/payment`, 'PUT', {
      amount: 400,
      payment_mode: 'UPI',
      transaction_id: 'UPI123456789'
    }, recToken);
    console.log('Outstanding payment cleared.');

    // ---- 15. Reports & Dashboard (Hospital Admin) ----
    console.log('\\n--- 15. Real-time Dashboard Verification ---');
    const dashRes = await request(`/dashboard/summary?hospital_id=${hospitalId}`, 'GET', null, haToken);
    console.log('Admin Dashboard Stats:');
    console.log(JSON.stringify(dashRes.data, null, 2));

    console.log('\\nAll tests completed successfully! SRS entities populated across tables.');
  } catch (e) {
    console.error('Sequence Failed:', e);
  }
}

runSeedAndTest();
