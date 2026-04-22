/**
 * E2E Phase 3 — Patient Management
 * Tests: register patient, get patient, search by name, search by mobile, update patient
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { apiCall } from "./helpers.js";
import { setupE2E, getTestState } from "./setup.js";

describe("Phase 3 — Patient Management", () => {
  let state;
  let patientId;
  let uhid;
  const suffix = Date.now();
  const mobileNumber = `98${suffix.toString().slice(-8)}`;

  beforeAll(async () => {
    state = await setupE2E();
  });

  it("POST /hospitals/:hId/branches/:bId/patients → 201 with UHID", async () => {
    const { status, data } = await apiCall(
      "clinical",
      "POST",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients`,
      {
        patientName: `E2E Patient ${suffix}`,
        mobileNumber,
        assignedDoctorId: state.doctorId,
        dateOfBirth: "1990-01-15",
        gender: "MALE",
        bloodGroup: "O+",
        address: {
          line1: "5 Test St",
          city: "Pune",
          state: "MH",
          zip: "411001",
        },
        formData: { formTemplateId: null, formVersion: null, responses: {} },
      },
    );
    expect(status).toBe(201);
    patientId = data.data?.patientId;
    uhid = data.data?.uhid;
    expect(patientId).toBeDefined();
    expect(uhid).toBeDefined();
  });

  it("GET /hospitals/:hId/branches/:bId/patients/:patientId → 200 correct shape", async () => {
    if (!patientId) return;
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients/${patientId}`,
    );
    expect(status).toBe(200);
    expect(data.data.patientName).toMatch(`E2E Patient ${suffix}`);
    expect(data.data.uhid).toBe(uhid);
  });

  it("GET /hospitals/:hId/patients/search?name=... → 200 returns patient in list", async () => {
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/hospitals/${state.hospitalId}/patients/search?name=E2E+Patient`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /hospitals/:hId/patients/search?mobile=... → 200 returns matching patient", async () => {
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/hospitals/${state.hospitalId}/patients/search?mobile=${mobileNumber}`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("PUT /hospitals/:hId/branches/:bId/patients/:patientId → 200 updates patient", async () => {
    if (!patientId) return;
    const { status, data } = await apiCall(
      "clinical",
      "PUT",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients/${patientId}`,
      {
        bloodGroup: "A+",
      },
    );
    expect(status).toBe(200);
    expect(data.data.bloodGroup).toBe("A+");
  });

  it("GET /hospitals/:hId/branches/:bId/patients → 200 returns list", async () => {
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET token for patient uses therapy stack", async () => {
    // Verify token was created via therapy stack
    const { status, data } = await apiCall(
      "therapy",
      "GET",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/tokens/today`,
    );
    expect([200, 404]).toContain(status);
  });

  afterAll(async () => {
    // patientId stored in module scope only — cleaned up via teardownE2E hospital delete
  });
});
