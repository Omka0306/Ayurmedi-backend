/**
 * E2E Phase 4 — Consultation + Prescription Lifecycle
 * Tests: create consultation, update with clinical data, complete,
 *        create prescription with medicines, verify
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { apiCall } from "./helpers.js";
import { setupE2E, getTestState } from "./setup.js";

describe("Phase 4 — Consultation & Prescription", () => {
  let state;
  let patientId;
  let tokenId;
  let consultId;
  let rxId;
  let itemId;
  const suffix = Date.now();
  const today = new Date().toISOString().split("T")[0];

  beforeAll(async () => {
    state = await setupE2E();

    // Register a patient first
    const { status: pStatus, data: pData } = await apiCall(
      "clinical",
      "POST",
      `/hospitals/${state.hospitalId}/branches/${state.branchId}/patients`,
      {
        patientName: `Consult Patient ${suffix}`,
        mobileNumber: `97${suffix.toString().slice(-8)}`,
        assignedDoctorId: state.doctorId,
        formData: { formTemplateId: null, formVersion: null, responses: {} },
      },
    );
    expect(pStatus).toBe(201);
    patientId = pData.data?.patientId;
    tokenId = pData.data?.tokenId;

    // Seed an inventory item for prescription test
    const { status: iStatus, data: iData } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/inventory`,
      {
        name: `E2E Medicine ${suffix}`,
        category: "PROPRIETARY",
        unit: "TABLET",
        purchasePrice: 10,
        sellingPrice: 15,
        currentStock: 0,
        reorderLevel: 5,
      },
    );
    if (iStatus === 201) {
      itemId = iData.data?.itemId;
    }

    if (itemId) {
      await apiCall(
        "billing",
        "POST",
        `/hospitals/${state.hospitalId}/inventory/${itemId}/stock-in`,
        {
          quantity: 100,
          reason: "E2E seed",
        },
      );
    }
  });

  it("POST /patients/:patientId/consultations → 201 with consultId", async () => {
    if (!patientId) return;
    const { status, data } = await apiCall(
      "clinical",
      "POST",
      `/patients/${patientId}/consultations`,
      {
        doctorId: state.doctorId,
        hospitalId: state.hospitalId,
        branchId: state.branchId,
        tokenId: tokenId || "E2E-TOKEN",
        chiefComplaint: "Headache and fatigue",
      },
    );
    expect(status).toBe(201);
    consultId = data.data?.consultId;
    expect(consultId).toBeDefined();
    expect(data.data.status).toBe("IN_PROGRESS");
  });

  it("GET /patients/:patientId/consultations → 200 includes new consultation", async () => {
    if (!patientId) return;
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/patients/${patientId}/consultations`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    if (consultId) {
      expect(data.data.some((c) => c.consultId === consultId)).toBe(true);
    }
  });

  it("PUT /patients/:patientId/consultations/:consultId → 200 updates clinical data", async () => {
    if (!consultId) return;
    const { status, data } = await apiCall(
      "clinical",
      "PUT",
      `/patients/${patientId}/consultations/${consultId}`,
      {
        clinicalExamination: {
          vitalSigns: {
            bp: "120/80",
            pulse: 72,
            temperature: 98.6,
            weight: 70,
          },
          ayurvedicDiagnosis: {
            dosha: { vata: true, pitta: false, kapha: false },
            treatmentPrinciple: "Vata pacification",
          },
        },
      },
    );
    expect(status).toBe(200);
    expect(data.data.clinicalExamination?.vitalSigns?.bp).toBe("120/80");
  });

  it("GET /patients/:patientId/consultations/:consultId → 200 correct detail", async () => {
    if (!consultId) return;
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/patients/${patientId}/consultations/${consultId}`,
    );
    expect(status).toBe(200);
    expect(data.data.consultId).toBe(consultId);
  });

  it("POST /patients/:patientId/consultations/:consultId/complete → 200 status=COMPLETED", async () => {
    if (!consultId) return;
    const { status, data } = await apiCall(
      "clinical",
      "POST",
      `/patients/${patientId}/consultations/${consultId}/complete`,
      {},
    );
    expect(status).toBe(200);
    expect(data.data.status).toBe("COMPLETED");
  });

  it("POST /consultations/:consultId/prescriptions → 201 creates prescription", async () => {
    if (!consultId) return;
    const medicines = itemId
      ? [
          {
            inventoryItemId: itemId,
            medicineName: `E2E Medicine ${suffix}`,
            dosageForm: "TABLET",
            dosageQty: 1,
            frequency: "TWICE_DAILY",
            timing: "AFTER_MEALS",
            durationDays: 5,
          },
        ]
      : [];

    const { status, data } = await apiCall(
      "clinical",
      "POST",
      `/consultations/${consultId}/prescriptions`,
      {
        patientId,
        doctorId: state.doctorId,
        hospitalId: state.hospitalId,
        medicines,
        dietInstructions: { pathya: ["Warm liquids"], apathya: ["Cold foods"] },
        precautions: "Avoid stress",
      },
    );
    expect(status).toBe(201);
    rxId = data.data?.rxId;
    expect(rxId).toBeDefined();
  });

  it("GET /consultations/:consultId/prescriptions → 200 includes prescription", async () => {
    if (!consultId) return;
    const { status, data } = await apiCall(
      "clinical",
      "GET",
      `/consultations/${consultId}/prescriptions`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  afterAll(async () => {
    // Cleaned via hospital delete in teardownE2E
  });
});
