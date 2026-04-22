const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(name, url, method, expectedStatus, expectedContent, extraHeaders = {}, body = null) {
  console.log(`\n=== ${name} ===`);
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let cmd = `curl -s -X ${method} "${url}"`;
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization') {
      cmd += ` -H "${k}: Bearer ***"`;
    } else {
      cmd += ` -H "${k}: ${v}"`;
    }
  }
  if (body) {
    cmd += ` -d '${JSON.stringify(body)}'`;
  }
  console.log(cmd);

  try {
    const response = await fetch(url, options);
    let responseBody = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(responseBody);
      responseBody = JSON.stringify(parsed, null, 2);
    } catch {}

    const isSuccess = response.status === expectedStatus;
    const isError = !isSuccess || response.status >= 300;
    
    if (isError) {
      console.log(`❌ ERROR: Status ${response.status} (Expected: ${expectedStatus})`);
      console.log(`Response:` + responseBody);
      return { success: false, data: parsed, status: response.status };
    } else {
      console.log(`✅ Status: ${response.status} (Expected: ${expectedStatus})`);
      console.log(responseBody.length > 500 ? responseBody.substring(0, 500) + '... (truncated)' : responseBody);
      return { success: true, data: parsed, status: response.status };
    }
  } catch (err) {
    console.log(`❌ FETCH ERROR: ${err.message}`);
    return { success: false, error: err };
  }
}

async function main() {
  const envContent = fs.readFileSync('.env.e2e', 'utf-16le');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) {
      env[parts[0]] = parts.slice(1).join('=');
    }
  });
  
  // if utf-16le didn't work, try utf8
  if (!env['API_BASE_URL']) {
    const envContentUtf8 = fs.readFileSync('.env.e2e', 'utf8');
    envContentUtf8.split('\n').forEach(line => {
        const parts = line.trim().split('=');
        if (parts.length >= 2) {
            env[parts[0]] = parts.slice(1).join('=');
        }
    });
  }

  // Force overwrite or log missing
  const {
    API_BASE_URL,
    HOSPITAL_ID,
    BRANCH_ID,
    ACCESS_TOKEN,
    TEST_PATIENT_ID,
    TEST_CONSULT_ID,
    TEST_RX_ID,
    TEST_PK_ID,
    TEST_BILL_ID
  } = env;

  if (!API_BASE_URL) {
    console.error("Missing API_BASE_URL in .env.e2e");
    process.exit(1);
  }

  let token = ACCESS_TOKEN;
  let refreshToken = null;
  let doctorId = null;
  let formId = null;
  let tokenId = null;

  // 1. Login
  let res = await runTest(
    '1. Login', 
    `${API_BASE_URL}/auth/login`, 
    'POST', 
    200, 
    'expected: accessToken', 
    {}, 
    {"email":"admin@mitramayurveda.com","password":"Admin@1234!"}
  );
  if (res.success && res.data) {
    token = res.data.accessToken || token;
    refreshToken = res.data.refreshToken;
  }

  // 2. Refresh token
  res = await runTest(
    '2. Refresh token',
    `${API_BASE_URL}/auth/refresh`,
    'POST',
    200,
    'expected: new accessToken',
    {},
    {"refreshToken": refreshToken}
  );

  // 3. Get hospital
  res = await runTest(
    '3. Get hospital',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}`,
    'GET',
    200,
    'expected: hospital object',
    { 'Authorization': `Bearer ${token}` }
  );

  // 4. Update hospital settings
  res = await runTest(
    '4. Update hospital settings',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}`,
    'PUT',
    200,
    'expected: updated hospital',
    { 'Authorization': `Bearer ${token}` },
    {"settings":{"timezone":"Asia/Kolkata","currency":"INR","language":"mr","expiryAlertDays":30}}
  );

  // 5. List branches
  res = await runTest(
    '5. List branches',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches`,
    'GET',
    200,
    'expected: array with 2 branches',
    { 'Authorization': `Bearer ${token}` }
  );

  // 6. Create new branch
  res = await runTest(
    '6. Create new branch',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches`,
    'POST',
    201,
    'expected: new branch',
    { 'Authorization': `Bearer ${token}` },
    {"name":"Mumbai Branch","address":"456 Marine Drive, Mumbai 400001","phone":"022-87654321"}
  );

  // 7. List doctors
  res = await runTest(
    '7. List doctors',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/doctors`,
    'GET',
    200,
    'expected: array with 3 doctors',
    { 'Authorization': `Bearer ${token}` }
  );
  if (res.success && res.data && res.data.length > 0) {
    doctorId = res.data[0].doctorId;
    console.log(`[Extracted DOCTOR_ID: ${doctorId}]`);
  }

  // 8. Get published form template
  res = await runTest(
    '8. Get published form template',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/forms`,
    'GET',
    200,
    'expected: array with at least 1 PUBLISHED form',
    { 'Authorization': `Bearer ${token}` }
  );
  if (res.success && res.data && res.data.length > 0) {
    formId = res.data.find(f => f.status === 'PUBLISHED')?.formId || res.data[0].formId;
    console.log(`[Extracted FORM_ID: ${formId}]`);
  }

  // 9. Get specific form
  if (formId) {
    res = await runTest(
      '9. Get specific form',
      `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/forms/${formId}`,
      'GET',
      200,
      'expected: full form',
      { 'Authorization': `Bearer ${token}` }
    );
  } else {
    console.log("Skipping 9. Get specific form (no formId)");
  }

  // 10. List patients
  res = await runTest(
    '10. List patients',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches/${BRANCH_ID}/patients`,
    'GET',
    200,
    'expected: array of 5 seeded patients',
    { 'Authorization': `Bearer ${token}` }
  );

  // 11. Get specific patient
  res = await runTest(
    '11. Get specific patient',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches/${BRANCH_ID}/patients/${TEST_PATIENT_ID}`,
    'GET',
    200,
    'expected: patient',
    { 'Authorization': `Bearer ${token}` }
  );

  // 12. Search patient by name
  res = await runTest(
    '12. Search patient by name',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/patients/search?q=Ramesh`,
    'GET',
    200,
    'expected: matching patients',
    { 'Authorization': `Bearer ${token}` }
  );

  // 13. Search patient by mobile
  res = await runTest(
    '13. Search patient by mobile',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/patients/search?q=9876543210`,
    'GET',
    200,
    'expected: matching patient',
    { 'Authorization': `Bearer ${token}` }
  );

  // 14. Register new patient
  res = await runTest(
    '14. Register new patient',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches/${BRANCH_ID}/patients`,
    'POST',
    201,
    'expected: new patient with uhid and tokenNumber',
    { 'Authorization': `Bearer ${token}` },
    {
      "assignedDoctorId": doctorId || "DUMMY_DOC",
      "formData": {
        "formTemplateId": formId || "DUMMY_FORM",
        "formVersion": 1,
        "responses": {
          "patientName": "Suresh Patil",
          "mobileNumber": "9123456780",
          "age": 38,
          "address": "789 Shivaji Nagar, Pune",
          "chiefComplaint": "Back pain and fatigue"
        }
      }
    }
  );
  if (res.success && res.data && res.data.tokenId) {
    tokenId = res.data.tokenId;
    console.log(`[Extracted TOKEN_ID: ${tokenId}]`);
  } else if (res.success && res.data && res.data.token && res.data.token.tokenId) {
    tokenId = res.data.token.tokenId;
    console.log(`[Extracted TOKEN_ID: ${tokenId}]`);
  }

  // 15. Get today queue
  res = await runTest(
    '15. Get today queue',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches/${BRANCH_ID}/tokens/today`,
    'GET',
    200,
    'expected: array of tokens',
    { 'Authorization': `Bearer ${token}` }
  );
  if (!tokenId && res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
      tokenId = res.data[0].tokenId;
      console.log(`[Extracted fallback TOKEN_ID: ${tokenId}]`);
  }

  // 16. Display board
  res = await runTest(
    '16. Display board (NO AUTH)",',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/branches/${BRANCH_ID}/tokens/display`,
    'GET',
    200,
    'expected: public token display data'
  );

  // 17. Call a token
  if (tokenId) {
    res = await runTest(
      '17. Call a token',
      `${API_BASE_URL}/tokens/${tokenId}/call`,
      'PUT',
      200,
      'expected: token status=CALLED',
      { 'Authorization': `Bearer ${token}` }
    );
  }

  // 18. Complete a token
  if (tokenId) {
    res = await runTest(
      '18. Complete a token',
      `${API_BASE_URL}/tokens/${tokenId}/complete`,
      'PUT',
      200,
      'expected: token status=COMPLETED',
      { 'Authorization': `Bearer ${token}` }
    );
  }

  // 19. Get consultation
  res = await runTest(
    '19. Get consultation',
    `${API_BASE_URL}/patients/${TEST_PATIENT_ID}/consultations/${TEST_CONSULT_ID}`,
    'GET',
    200,
    'expected: consultation',
    { 'Authorization': `Bearer ${token}` }
  );

  // 20. Create new consultation
  res = await runTest(
    '20. Create new consultation',
    `${API_BASE_URL}/patients/${TEST_PATIENT_ID}/consultations`,
    'POST',
    201,
    'expected: new consultation',
    { 'Authorization': `Bearer ${token}` },
    {
      "doctorId": doctorId || "DUMMY",
      "tokenId": tokenId || "DUMMY",
      "chiefComplaint": "Digestive issues and bloating",
      "clinicalExamination": {
        "vitalSigns": { "bp": "122/80", "pulse": 74, "weight": 68 },
        "ashtavidhaPariksha": { "nadi": "Vata dominant", "jihwa": "White coating" },
        "ayurvedicDiagnosis": { "dosha": { "vata": true, "pitta": false, "kapha": true }, "avastha": "Chronic" }
      }
    }
  );

  // 21. Get prescription
  res = await runTest(
    '21. Get prescription',
    `${API_BASE_URL}/consultations/${TEST_CONSULT_ID}/prescriptions`,
    'GET',
    200,
    'expected: prescription array/object',
    { 'Authorization': `Bearer ${token}` }
  );

  // 22. Generate prescription PDF
  res = await runTest(
    '22. Generate prescription PDF',
    `${API_BASE_URL}/prescriptions/${TEST_RX_ID}/pdf`,
    'GET',
    200,
    'expected: { presignedUrl }',
    { 'Authorization': `Bearer ${token}` }
  );

  // 23. Get PK plan
  res = await runTest(
    '23. Get PK plan',
    `${API_BASE_URL}/panchakarma/${TEST_PK_ID}`,
    'GET',
    200,
    'expected: PK plan',
    { 'Authorization': `Bearer ${token}` }
  );

  // 24. List PK sessions
  res = await runTest(
    '24. List PK sessions',
    `${API_BASE_URL}/panchakarma/${TEST_PK_ID}/sessions`,
    'GET',
    200,
    'expected: array of sessions',
    { 'Authorization': `Bearer ${token}` }
  );

  // 25. Get bill
  res = await runTest(
    '25. Get bill',
    `${API_BASE_URL}/bills/${TEST_BILL_ID}`,
    'GET',
    200,
    'expected: bill',
    { 'Authorization': `Bearer ${token}` }
  );

  // 26. Add payment
  res = await runTest(
    '26. Add payment',
    `${API_BASE_URL}/bills/${TEST_BILL_ID}/payment`,
    'POST',
    200,
    'expected: updated bill',
    { 'Authorization': `Bearer ${token}` },
    {"amount": 500, "mode": "UPI", "reference": "UPI20260313001"}
  );

  // 27. Generate bill PDF
  res = await runTest(
    '27. Generate bill PDF',
    `${API_BASE_URL}/bills/${TEST_BILL_ID}/pdf`,
    'GET',
    200,
    'expected: presignedUrl',
    { 'Authorization': `Bearer ${token}` }
  );

  // 28. Revenue summary
  res = await runTest(
    '28. Revenue summary',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/bills/summary?from=2026-01-01&to=2026-12-31`,
    'GET',
    200,
    'expected: revenue summary',
    { 'Authorization': `Bearer ${token}` }
  );

  // 29. List inventory
  let inventoryItemId = null;
  res = await runTest(
    '29. List inventory',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/inventory`,
    'GET',
    200,
    'expected: array of seeded items',
    { 'Authorization': `Bearer ${token}` }
  );
  if (res.success && res.data && res.data.length > 0) {
    inventoryItemId = res.data[0].itemId;
    console.log(`[Extracted ITEM_ID: ${inventoryItemId}]`);
  }

  // 30. Stock-in
  res = await runTest(
    '30. Stock-in',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/inventory/${inventoryItemId || "DUMMY"}/stock-in`,
    'POST',
    200,
    'expected: updated stock',
    { 'Authorization': `Bearer ${token}` },
    {"quantity": 200, "supplierName": "Dabur India", "purchasePrice": 110, "batchNumber": "BN2026002", "expiryDate": "2028-06-01"}
  );

  // 31. Low stock alerts
  res = await runTest(
    '31. Low stock alerts',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/inventory/alerts/low-stock`,
    'GET',
    200,
    'expected: array',
    { 'Authorization': `Bearer ${token}` }
  );

  // 32. Daily OPD report
  res = await runTest(
    '32. Daily OPD report',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/reports/daily-opd?date=2026-03-13`,
    'GET',
    200,
    'expected: opd report',
    { 'Authorization': `Bearer ${token}` }
  );

  // 33. Revenue report
  res = await runTest(
    '33. Revenue report',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/reports/revenue?from=2026-01-01&to=2026-12-31`,
    'GET',
    200,
    'expected: revenue data',
    { 'Authorization': `Bearer ${token}` }
  );

  // 34. Request full patient history PDF (async)
  let jobId = null;
  res = await runTest(
    '34. Request full patient history PDF',
    `${API_BASE_URL}/patients/${TEST_PATIENT_ID}/reports/full-history/pdf`,
    'GET',
    202,
    'expected: 202 queued',
    { 'Authorization': `Bearer ${token}` }
  );
  if (res.success && res.data && res.data.jobId) {
    jobId = res.data.jobId;
    console.log(`[Extracted JOB_ID: ${jobId}]`);
  }

  // 35. Poll for PDF job
  if (jobId) {
    for (let i = 0; i < 5; i++) {
        res = await runTest(
          `35. Poll for PDF job (Attempt ${i+1})`,
          `${API_BASE_URL}/reports/jobs/${jobId}`,
          'GET',
          200,
          'expected: job COMPLETED',
          { 'Authorization': `Bearer ${token}` }
        );
        if (res.data && res.data.status === 'COMPLETED') {
            break;
        }
        await sleep(5000);
    }
  }

  // 36. Admin dashboard
  res = await runTest(
    '36. Admin dashboard',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/dashboard/admin`,
    'GET',
    200,
    'expected: full dashboard',
    { 'Authorization': `Bearer ${token}` }
  );

  // 37. Reception dashboard
  res = await runTest(
    '37. Reception dashboard',
    `${API_BASE_URL}/hospitals/${HOSPITAL_ID}/dashboard/reception`,
    'GET',
    200,
    'expected: queue data',
    { 'Authorization': `Bearer ${token}` }
  );

}

main().catch(console.error);
