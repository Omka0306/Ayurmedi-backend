/**
 * E2E Phase 2 — Hospital & Branch Management
 * Tests: get hospital, update hospital settings, create branch, list branches, update branch
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { apiCall } from "./helpers.js";
import { setupE2E, getTestState } from "./setup.js";

describe("Phase 2 — Hospital & Branches", () => {
  let state;
  let newBranchId;

  beforeAll(async () => {
    state = await setupE2E();
  });

  it("GET /hospitals/:hospitalId → 200 with correct hospital shape", async () => {
    const { status, data } = await apiCall(
      "core",
      "GET",
      `/hospitals/${state.hospitalId}`,
    );
    expect(status).toBe(200);
    expect(data.data.hospitalId).toBe(state.hospitalId);
    expect(data.data.name).toBeDefined();
  });

  it("PUT /hospitals/:hospitalId → 200 updates hospital settings", async () => {
    const { status, data } = await apiCall(
      "core",
      "PUT",
      `/hospitals/${state.hospitalId}`,
      {
        settings: {
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
          workingHours: { start: "09:00", end: "18:00" },
          tokenPrefix: "A",
          appointmentDurationMinutes: 20,
        },
      },
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("POST /hospitals/:hospitalId/branches → 201 creates branch", async () => {
    const { status, data } = await apiCall(
      "core",
      "POST",
      `/hospitals/${state.hospitalId}/branches`,
      {
        name: "E2E Secondary Branch",
        address: {
          line1: "2 Branch Rd",
          city: "Mumbai",
          state: "MH",
          zip: "400001",
        },
        phone: "9876500001",
      },
    );
    expect(status).toBe(201);
    newBranchId = data.data?.branchId;
    expect(newBranchId).toBeDefined();
  });

  it("GET /hospitals/:hospitalId/branches → 200 with array of branches", async () => {
    const { status, data } = await apiCall(
      "core",
      "GET",
      `/hospitals/${state.hospitalId}/branches`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });

  it("PUT /hospitals/:hospitalId/branches/:branchId → 200 updates branch", async () => {
    if (!newBranchId) return;
    const { status, data } = await apiCall(
      "core",
      "PUT",
      `/hospitals/${state.hospitalId}/branches/${newBranchId}`,
      {
        name: "E2E Secondary Branch Updated",
      },
    );
    expect(status).toBe(200);
    expect(data.data.name).toBe("E2E Secondary Branch Updated");
  });

  it("GET /hospitals/{wrongId} returns 403 for other hospital", async () => {
    const { status } = await apiCall(
      "core",
      "GET",
      "/hospitals/wrong-hospital-id-000",
    );
    expect(status).toBe(403);
  });

  afterAll(async () => {
    // newBranchId cleanup - no delete endpoint defined; branch lives with hospital
  });
});
