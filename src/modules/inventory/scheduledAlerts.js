import { scan, put, update } from "../../common/db.js";

// EventBridge scheduled Lambda — runs daily at 7AM IST (cron 0 1 * * ? *)
export const handler = async () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  try {
    // Scan all ACTIVE/LOW_STOCK inventory items across all hospitals
    const result = await scan({
      FilterExpression: "entityType = :et AND #st IN (:active, :low)",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":et": "INVENTORY_ITEM",
        ":active": "ACTIVE",
        ":low": "LOW_STOCK"
      }
    });

    const items = result.Items || [];
    const alertPromises = [];

    for (const item of items) {
      const { itemId, hospitalId, name, currentStock, reorderLevel, expiryDate } = item;

      // ── Low Stock Alert ──────────────────────────────────────────
      if (currentStock <= reorderLevel) {
        // Mark item as LOW_STOCK
        alertPromises.push(
          update({
            PK: `HOSP#${hospitalId}`,
            SK: `INV#${itemId}`,
            UpdateExpression: "SET #st = :status, updatedAt = :ts",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: { ":status": "LOW_STOCK", ":ts": now.toISOString() }
          })
        );

        // Write alert record
        alertPromises.push(
          put({
            PK: `ALERT#HOSP#${hospitalId}`,
            SK: `LOW_STOCK#${itemId}#${today}`,
            entityType: "ALERT",
            alertType: "LOW_STOCK",
            itemId,
            hospitalId,
            itemName: name,
            currentStock,
            reorderLevel,
            createdAt: now.toISOString()
          })
        );
      }

      // ── Expiry Alert ─────────────────────────────────────────────
      if (expiryDate) {
        const expiryMs = new Date(expiryDate).getTime();
        const nowMs = now.getTime();
        const daysUntilExpiry = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

        // Default threshold: 30 days (hospital settings can extend to 60/90 later)
        const alertDays = 30;

        if (daysUntilExpiry <= alertDays && daysUntilExpiry >= 0) {
          alertPromises.push(
            put({
              PK: `ALERT#HOSP#${hospitalId}`,
              SK: `EXPIRY#${itemId}#${today}`,
              entityType: "ALERT",
              alertType: "EXPIRY",
              itemId,
              hospitalId,
              itemName: name,
              expiryDate,
              daysUntilExpiry,
              createdAt: now.toISOString()
            })
          );
        }

        // Mark as EXPIRED if already expired
        if (daysUntilExpiry < 0) {
          alertPromises.push(
            update({
              PK: `HOSP#${hospitalId}`,
              SK: `INV#${itemId}`,
              UpdateExpression: "SET #st = :status, updatedAt = :ts",
              ExpressionAttributeNames: { "#st": "status" },
              ExpressionAttributeValues: { ":status": "EXPIRED", ":ts": now.toISOString() }
            })
          );
        }
      }
    }

    // Execute all alerts + status updates concurrently (batched to avoid Lambda timeout)
    const batchSize = 25;
    for (let i = 0; i < alertPromises.length; i += batchSize) {
      await Promise.all(alertPromises.slice(i, i + batchSize));
    }

    console.log(`[InventoryAlerts] Processed ${items.length} items, generated ${alertPromises.length} operations`);
    return { statusCode: 200, body: `Processed ${items.length} items` };
  } catch (err) {
    console.error("[InventoryAlerts] Error:", err);
    throw err;
  }
};
