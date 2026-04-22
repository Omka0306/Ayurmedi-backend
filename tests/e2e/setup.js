// tests/e2e/setup.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.e2e" });
import { writeFileSync } from "fs";

// Each stack has its own API Gateway URL
export const URLS = {
  auth: process.env.AUTH_BASE_URL, // Auth + Users
  core: process.env.CORE_BASE_URL, // Hospitals, Branches, Doctors, Forms
  clinical: process.env.CLINICAL_BASE_URL, // Patients, Consultations, Prescriptions
  billing: process.env.BILLING_BASE_URL, // Bills, Inventory
  reports: process.env.REPORTS_BASE_URL, // Reports, Dashboard
  therapy: process.env.THERAPY_BASE_URL, // Tokens, Panchakarma
};

// Validate all URLs are set
const missingUrls = Object.entries(URLS)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingUrls.length > 0) {
  throw new Error(`Missing API URLs in .env.e2e: ${missingUrls.join(", ")}`);
}

export let testState = {};

export default async function globalSetup() {
  // Register test hospital
  console.log("E2E Setup: Registering test hospital...");
  const adminEmail = `e2e-${Date.now()}@test.com`;
  const password = "E2ETest@1234!";

  const regRes = await fetch(`${URLS.auth}/auth/register-hospital`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hospitalName: "E2E Test Hospital",
      adminEmail,
      password,
      phone: "9000000001",
      hospitalType: "AYURVEDIC",
    }),
  });

  if (!regRes.ok) {
    const errorText = await regRes.text();
    throw new Error(
      `Register hospital failed: ${regRes.status} - ${errorText}`,
    );
  }

  const reg = await regRes.json();
  console.log("E2E Setup: Register response:", JSON.stringify(reg, null, 2));

  if (!reg.data?.hospitalId) {
    throw new Error(
      `Register hospital returned invalid data: ${JSON.stringify(reg)}`,
    );
  }

  // Login
  console.log("E2E Setup: Logging in...");
  const loginRes = await fetch(`${URLS.auth}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password }),
  });

  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} - ${errorText}`);
  }

  const login = await loginRes.json();
  console.log("E2E Setup: Login response:", JSON.stringify(login, null, 2));

  if (!login.data?.accessToken) {
    throw new Error(`Login returned invalid data: ${JSON.stringify(login)}`);
  }

  testState = {
    hospitalId: reg.data.hospitalId,
    accessToken: login.data.accessToken,
    refreshToken: login.data.refreshToken,
  };

  // Create branch
  console.log("E2E Setup: Creating branch...");
  const branchRes = await fetch(
    `${URLS.core}/hospitals/${testState.hospitalId}/branches`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testState.accessToken}`,
      },
      body: JSON.stringify({
        name: "E2E Main Branch",
        address: {
          line1: "Test Address",
          city: "Pune",
          state: "MH",
          zip: "411001",
        },
        phone: "9000000002",
      }),
    },
  );

  if (!branchRes.ok) {
    const errorText = await branchRes.text();
    throw new Error(`Create branch failed: ${branchRes.status} - ${errorText}`);
  }

  const branchData = await branchRes.json();
  console.log(
    "E2E Setup: Branch response:",
    JSON.stringify(branchData, null, 2),
  );

  if (!branchData.data?.branchId) {
    throw new Error(
      `Create branch returned invalid data: ${JSON.stringify(branchData)}`,
    );
  }

  testState.branchId = branchData.data.branchId;

  // Create doctor
  console.log("E2E Setup: Creating doctor...");
  const doctorRes = await fetch(
    `${URLS.core}/hospitals/${testState.hospitalId}/doctors`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testState.accessToken}`,
      },
      body: JSON.stringify({
        name: "E2E Test Doctor",
        specialization: "General Ayurveda",
        branchIds: [testState.branchId],
        averageConsultationMinutes: 15,
      }),
    },
  );

  if (!doctorRes.ok) {
    const errorText = await doctorRes.text();
    throw new Error(`Create doctor failed: ${doctorRes.status} - ${errorText}`);
  }

  const doctorData = await doctorRes.json();
  console.log(
    "E2E Setup: Doctor response:",
    JSON.stringify(doctorData, null, 2),
  );

  if (!doctorData.data?.doctorId) {
    throw new Error(
      `Create doctor returned invalid data: ${JSON.stringify(doctorData)}`,
    );
  }

  testState.doctorId = doctorData.data.doctorId;

  // Register test patient
  console.log("E2E Setup: Registering patient...");
  const patientRes = await fetch(
    `${URLS.clinical}/hospitals/${testState.hospitalId}/branches/${testState.branchId}/patients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testState.accessToken}`,
      },
      body: JSON.stringify({
        assignedDoctorId: testState.doctorId,
        formData: {
          responses: {
            patientName: "E2E Patient",
            mobileNumber: "9000000003",
            age: 35,
            chiefComplaint: "Test complaint",
          },
        },
      }),
    },
  );

  if (!patientRes.ok) {
    const errorText = await patientRes.text();
    throw new Error(
      `Register patient failed: ${patientRes.status} - ${errorText}`,
    );
  }

  const patient = await patientRes.json();
  console.log("E2E Setup: Patient response:", JSON.stringify(patient, null, 2));

  if (!patient.data?.patientId) {
    throw new Error(
      `Register patient returned invalid data: ${JSON.stringify(patient)}`,
    );
  }

  testState.patientId = patient.data.patientId;
  testState.tokenId = patient.data.tokenId;

  console.log("E2E Setup complete:", JSON.stringify(testState, null, 2));

  // Write state to file so teardown can clean up
  writeFileSync(".e2e-state.json", JSON.stringify(testState));
}

export function getAuthHeader() {
  return { Authorization: `Bearer ${testState.accessToken}` };
}

export function getState() {
  return testState;
}

// Legacy exports for compatibility
export const getTestState = getState;
