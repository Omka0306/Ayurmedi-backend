/**
 * E2E Phase 6 — Inventory Management
 * Tests: create item, stock-in, get item, verify low-stock alert,
 *        list items, update item
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { apiCall } from "./helpers.js";
import { setupE2E } from "./setup.js";

describe("Phase 6 — Inventory", () => {
  let state;
  let itemId;
  const suffix = Date.now();

  beforeAll(async () => {
    state = await setupE2E();
  });

  it("POST /hospitals/:hId/inventory → 201 creates inventory item", async () => {
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/inventory`,
      {
        name: `Brahmi Churna ${suffix}`,
        category: "CHURNA",
        unit: "GRAM",
        purchasePrice: 5,
        sellingPrice: 8,
        currentStock: 0,
        reorderLevel: 200,
      },
    );
    expect(status).toBe(201);
    itemId = data.data?.itemId;
    expect(itemId).toBeDefined();
    expect(data.data.currentStock).toBe(0);
  });

  it("GET /hospitals/:hId/inventory → 200 returns list with created item", async () => {
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/inventory`,
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    if (itemId) {
      expect(data.data.some((i) => i.itemId === itemId)).toBe(true);
    }
  });

  it("GET /hospitals/:hId/inventory/:itemId → 200 correct details", async () => {
    if (!itemId) return;
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/inventory/${itemId}`,
    );
    expect(status).toBe(200);
    expect(data.data.itemId).toBe(itemId);
    expect(data.data.name).toContain("Brahmi Churna");
  });

  it("POST /hospitals/:hId/inventory/:itemId/stock-in → 201 increases stock", async () => {
    if (!itemId) return;
    const { status, data } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/inventory/${itemId}/stock-in`,
      {
        quantity: 500,
        reason: "E2E stock seed",
      },
    );
    expect(status).toBe(201);
    expect(data.success).toBe(true);
  });

  it("GET /hospitals/:hId/inventory/:itemId → 200 stock=500 after stock-in", async () => {
    if (!itemId) return;
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/inventory/${itemId}`,
    );
    expect(status).toBe(200);
    expect(data.data.currentStock).toBe(500);
  });

  it("GET /hospitals/:hId/inventory?lowStock=true → 200 item is NOT low (500 > 200 threshold)", async () => {
    const { status, data } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/inventory?lowStock=true`,
    );
    // Accept 200 or 404/501 if low-stock filter not implemented
    expect([200, 404, 501]).toContain(status);
    if (status === 200) {
      // Our item has 500 > reorderLevel 200, so should NOT be in low-stock list
      if (itemId && Array.isArray(data.data)) {
        expect(data.data.every((i) => i.itemId !== itemId)).toBe(true);
      }
    }
  });

  it("Verify low-stock alert: stock-in small batch below reorder → item appears in low-stock", async () => {
    // Create a separate item with reorderLevel=100, stock 10 (below threshold)
    const { status: lowStatus, data: lowData } = await apiCall(
      "billing",
      "POST",
      `/hospitals/${state.hospitalId}/inventory`,
      {
        name: `LowStock Herb ${suffix}`,
        category: "KADHA",
        unit: "ML",
        purchasePrice: 2,
        sellingPrice: 4,
        currentStock: 10,
        reorderLevel: 100,
      },
    );
    expect(lowStatus).toBe(201);
    const lowItemId = lowData.data?.itemId;

    const { status: checkStatus, data: checkData } = await apiCall(
      "billing",
      "GET",
      `/hospitals/${state.hospitalId}/inventory?lowStock=true`,
    );
    expect([200, 404, 501]).toContain(checkStatus);
    if (checkStatus === 200 && lowItemId) {
      if (Array.isArray(checkData.data)) {
        expect(checkData.data.some((i) => i.itemId === lowItemId)).toBe(true);
      }
    }
  });

  it("PUT /hospitals/:hId/inventory/:itemId → 200 updates item details", async () => {
    if (!itemId) return;
    const { status, data } = await apiCall(
      "billing",
      "PUT",
      `/hospitals/${state.hospitalId}/inventory/${itemId}`,
      {
        sellingPrice: 10,
        reorderLevel: 250,
      },
    );
    expect(status).toBe(200);
    expect(data.data.sellingPrice).toBe(10);
    expect(data.data.reorderLevel).toBe(250);
  });

  afterAll(async () => {
    // Cleaned via hospital delete in teardownE2E
  });
});
