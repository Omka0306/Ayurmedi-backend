import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { 
  createItem, 
  listItems,
  getItem,
  updateItem,
  deleteItem,
  stockIn,
  stockAdjust,
  getLowStockAlerts,
  getExpiryAlerts
} = await import("../../src/modules/inventory/handler.js");
const { handler: alertScheduler } = await import("../../src/modules/inventory/scheduledAlerts.js");

const validHospitalId = "11111111-1111-1111-1111-111111111111";
const validItemId = "22222222-2222-2222-2222-222222222222";

const validCaller = {
  requestContext: {
    authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: validHospitalId, role: "PHARMACIST" }
  }
};

describe("inventory module", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.get.mockResolvedValue({});
    db.put.mockResolvedValue({});
    db.update.mockResolvedValue({});
    db.query.mockResolvedValue({ Items: [] });
    db.scan.mockResolvedValue({ Items: [] });
  });

  it("Add item: saves correctly with ACTIVE status", async () => {
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId },
      body: JSON.stringify({
        name: "Aswagandha",
        category: "HERB",
        unit: "GRAM",
        purchasePrice: 100,
        sellingPrice: 150,
        currentStock: 50,
        reorderLevel: 10
      })
    };

    const res = await createItem(event);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe("ACTIVE");
    expect(body.data.currentStock).toBe(50);
    expect(db.put).toHaveBeenCalled();
  });

  it("Stock-in: increments currentStock, creates STOCK_IN transaction, updates status to LOW_STOCK if below reorderLevel", async () => {
    db.get.mockResolvedValueOnce({
      itemId: validItemId,
      hospitalId: validHospitalId,
      currentStock: 2,
      reorderLevel: 10,
      expiryDate: null
    });
    
    db.update.mockResolvedValueOnce({ currentStock: 7, status: "LOW_STOCK" }); // 2 + 5 = 7
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, itemId: validItemId },
      body: JSON.stringify({ quantity: 5, reason: "New batch arrived" })
    };

    const res = await stockIn(event);
    expect(res.statusCode).toBe(201);
    
    const body = JSON.parse(res.body);
    // It is < 10, so status should be LOW_STOCK
    
    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":stock"]).toBe(7);
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("LOW_STOCK");
    
    const putCall = db.put.mock.calls[0][0];
    expect(putCall.entityType).toBe("STOCK_TRANSACTION");
    expect(putCall.type).toBe("STOCK_IN");
    expect(putCall.balanceAfter).toBe(7);
  });

  it("Stock-adjust: creates ADJUSTMENT transaction, updates currentStock", async () => {
    db.get.mockResolvedValueOnce({
      itemId: validItemId,
      hospitalId: validHospitalId,
      currentStock: 50,
      reorderLevel: 10,
      expiryDate: null
    });
    
    db.update.mockResolvedValueOnce({ currentStock: 45, status: "ACTIVE" }); // 50 - 5 = 45
    
    const event = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, itemId: validItemId },
      body: JSON.stringify({ quantity: -5, reason: "Damage" })
    };

    const res = await stockAdjust(event);
    expect(res.statusCode).toBe(201);
    
    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":stock"]).toBe(45);
    
    const putCall = db.put.mock.calls[0][0];
    expect(putCall.entityType).toBe("STOCK_TRANSACTION");
    expect(putCall.type).toBe("ADJUSTMENT");
    expect(putCall.quantity).toBe(-5);
    expect(putCall.balanceAfter).toBe(45);
  });

  it("Soft delete: sets status=ARCHIVED, item not returned in active listing", async () => {
    db.get.mockResolvedValueOnce({
      itemId: validItemId,
      hospitalId: validHospitalId,
      status: "ACTIVE"
    });
    
    const deleteEvent = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId, itemId: validItemId }
    };
    
    const res = await deleteItem(deleteEvent);
    expect(res.statusCode).toBe(200);
    
    const updateCall = db.update.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[":status"]).toBe("ARCHIVED");
    
    // Listing query mock containing an ARCHIVED item
    db.query.mockResolvedValueOnce({
      Items: [
        { itemId: "item1", name: "A", status: "ACTIVE" },
        { itemId: "item2", name: "B", status: "ARCHIVED" }
      ]
    });
    
    const listEvent = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId }
    };
    
    const listRes = await listItems(listEvent);
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0].itemId).toBe("item1");
  });

  it("Scheduled alerts: identifies low stock and expiring items, writes alert records, updates statuses", async () => {
    // Mock the scan for items
    const today = new Date();
    const closeExpiry = new Date();
    closeExpiry.setDate(today.getDate() + 10); // 10 days away
    
    const pastExpiry = new Date();
    pastExpiry.setDate(today.getDate() - 5);   // expired 5 days ago
    
    db.scan.mockResolvedValueOnce({
      Items: [
        // Item 1: Low stock
        { itemId: "i1", hospitalId: "h1", name: "I1", currentStock: 5, reorderLevel: 10, expiryDate: null },
        // Item 2: Expiring soon (10 days)
        { itemId: "i2", hospitalId: "h1", name: "I2", currentStock: 50, reorderLevel: 10, expiryDate: closeExpiry.toISOString() },
        // Item 3: Already expired
        { itemId: "i3", hospitalId: "h1", name: "I3", currentStock: 50, reorderLevel: 10, expiryDate: pastExpiry.toISOString() },
        // Item 4: Normal item, no alert
        { itemId: "i4", hospitalId: "h1", name: "I4", currentStock: 50, reorderLevel: 10, expiryDate: null }
      ]
    });
    
    const res = await alertScheduler();
    expect(res.statusCode).toBe(200);
    
    // Check put calls for Alert records
    const putCalls = db.put.mock.calls.map(c => c[0]);
    
    const lowStockAlert = putCalls.find(p => p.alertType === "LOW_STOCK" && p.itemId === "i1");
    expect(lowStockAlert).toBeDefined();
    
    const expiryAlert = putCalls.find(p => p.alertType === "EXPIRY" && p.itemId === "i2");
    expect(expiryAlert).toBeDefined();
    expect(expiryAlert.daysUntilExpiry).toBe(10);
    
    // Check update calls for status changes
    const updateCalls = db.update.mock.calls.map(c => c[0]);
    
    const lowStockUpdate = updateCalls.find(u => u.SK === "INV#i1");
    expect(lowStockUpdate.ExpressionAttributeValues[":status"]).toBe("LOW_STOCK");
    
    const expiredUpdate = updateCalls.find(u => u.SK === "INV#i3");
    expect(expiredUpdate.ExpressionAttributeValues[":status"]).toBe("EXPIRED");
  });

  it("Alert endpoints: read from pre-computed records", async () => {
    db.query.mockResolvedValueOnce({
      Items: [ { alertType: "LOW_STOCK", itemId: "i1", itemName: "I1" } ]
    });
    
    const ev1 = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId }
    };
    
    const res1 = await getLowStockAlerts(ev1);
    expect(res1.statusCode).toBe(200);
    
    const queryCall1 = db.query.mock.calls[0][0];
    expect(queryCall1.ExpressionAttributeValues[":skPrefix"]).toBe("LOW_STOCK#");
    
    db.query.mockResolvedValueOnce({
      Items: [ { alertType: "EXPIRY", itemId: "i2", itemName: "I2" } ]
    });
    
    const ev2 = {
      ...validCaller,
      pathParameters: { hospitalId: validHospitalId }
    };
    
    const res2 = await getExpiryAlerts(ev2);
    expect(res2.statusCode).toBe(200);
    
    const queryCall2 = db.query.mock.calls[1][0];
    expect(queryCall2.ExpressionAttributeValues[":skPrefix"]).toBe("EXPIRY#");
  });
});
