import { v4 as uuidv4 } from "uuid";
import { get, put, update, query, scan } from "../../common/db.js";
import { AuthError, NotFoundError, ConflictError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const computeStatus = (currentStock, reorderLevel, expiryDate) => {
  if (expiryDate && new Date(expiryDate) <= new Date()) return "EXPIRED";
  if (currentStock <= reorderLevel) return "LOW_STOCK";
  return "ACTIVE";
};

const getItem = async (hospitalId, itemId) => {
  const item = await get({ PK: `HOSP#${hospitalId}`, SK: `INV#${itemId}` });
  if (!item) throw new NotFoundError("Inventory item not found");
  return item;
};

// ─── Create Inventory Item ────────────────────────────────────────────────────
export const createItem = async (caller, hospitalId, data) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const itemId = uuidv4();
  const timestamp = new Date().toISOString();
  const status = computeStatus(data.currentStock, data.reorderLevel, data.expiryDate);

  const item = {
    PK: `HOSP#${hospitalId}`,
    SK: `INV#${itemId}`,
    "GSI1-PK": `CATEGORY#${data.category}`,
    "GSI1-SK": `NAME#${data.name}`,
    entityType: "INVENTORY_ITEM",
    itemId,
    hospitalId,
    name: data.name,
    genericName: data.genericName || "",
    category: data.category,
    unit: data.unit,
    purchasePrice: data.purchasePrice,
    sellingPrice: data.sellingPrice,
    currentStock: data.currentStock,
    reorderLevel: data.reorderLevel,
    reorderQuantity: data.reorderQuantity || 0,
    supplierName: data.supplierName || "",
    supplierContact: data.supplierContact || "",
    expiryDate: data.expiryDate || null,
    batchNumber: data.batchNumber || "",
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(item);
  await logChange({ entityId: itemId, entityType: "INVENTORY_ITEM", action: "CREATE", userId: caller.userId, hospitalId, before: null, after: item });
  return item;
};

// ─── List Inventory Items ─────────────────────────────────────────────────────
export const listItems = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `HOSP#${hospitalId}`, ":skPrefix": "INV#" }
  });
  return (result.Items || []).filter(i => i.status !== "ARCHIVED").sort((a, b) => a.name.localeCompare(b.name));
};

// ─── Get Single Item ──────────────────────────────────────────────────────────
export const getItemById = async (caller, hospitalId, itemId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const item = await getItem(hospitalId, itemId);
  if (item.status === "ARCHIVED") throw new NotFoundError("Item not found");
  return item;
};

// ─── Update Item ──────────────────────────────────────────────────────────────
export const updateItem = async (caller, hospitalId, itemId, data) => {
  const item = await getItemById(caller, hospitalId, itemId);
  const timestamp = new Date().toISOString();

  const fields = ["name", "genericName", "category", "unit", "purchasePrice", "sellingPrice",
    "reorderLevel", "reorderQuantity", "supplierName", "supplierContact", "expiryDate", "batchNumber"];

  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const vals = { ":ts": timestamp, ":ub": caller.userId };

  for (const field of fields) {
    if (data[field] !== undefined) {
      updateExp += `, ${field} = :${field}`;
      vals[`:${field}`] = data[field];
    }
  }

  // Recompute status
  const newReorderLevel = data.reorderLevel ?? item.reorderLevel;
  const newExpiry = data.expiryDate ?? item.expiryDate;
  const newStatus = computeStatus(item.currentStock, newReorderLevel, newExpiry);
  updateExp += ", #st = :status";
  vals[":status"] = newStatus;

  const updatedItem = await update({
    PK: `HOSP#${hospitalId}`,
    SK: `INV#${itemId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: vals,
    ReturnValues: "ALL_NEW"
  });

  await logChange({ entityId: itemId, entityType: "INVENTORY_ITEM", action: "UPDATE", userId: caller.userId, hospitalId, before: item, after: updatedItem });
  return updatedItem;
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────
export const archiveItem = async (caller, hospitalId, itemId) => {
  const item = await getItemById(caller, hospitalId, itemId);
  const timestamp = new Date().toISOString();

  const updatedItem = await update({
    PK: `HOSP#${hospitalId}`,
    SK: `INV#${itemId}`,
    UpdateExpression: "SET #st = :status, updatedAt = :ts, updatedBy = :ub",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: { ":status": "ARCHIVED", ":ts": timestamp, ":ub": caller.userId },
    ReturnValues: "ALL_NEW"
  });

  await logChange({ entityId: itemId, entityType: "INVENTORY_ITEM", action: "ARCHIVE", userId: caller.userId, hospitalId, before: item, after: updatedItem });
  return updatedItem;
};

// ─── Stock-In ─────────────────────────────────────────────────────────────────
export const stockIn = async (caller, hospitalId, itemId, data) => {
  const item = await getItemById(caller, hospitalId, itemId);
  const txnId = uuidv4();
  const timestamp = new Date().toISOString();
  const newStock = item.currentStock + data.quantity;
  const newStatus = computeStatus(newStock, item.reorderLevel, data.expiryDate || item.expiryDate);

  // Update item stock + optional batch/expiry overrides
  let updateExp = "SET currentStock = :stock, #st = :status, updatedAt = :ts, updatedBy = :ub";
  const vals = { ":stock": newStock, ":status": newStatus, ":ts": timestamp, ":ub": caller.userId };
  if (data.batchNumber !== undefined) { updateExp += ", batchNumber = :bn"; vals[":bn"] = data.batchNumber; }
  if (data.expiryDate !== undefined) { updateExp += ", expiryDate = :exp"; vals[":exp"] = data.expiryDate; }
  if (data.purchasePrice !== undefined) { updateExp += ", purchasePrice = :pp"; vals[":pp"] = data.purchasePrice; }

  const updatedItem = await update({
    PK: `HOSP#${hospitalId}`,
    SK: `INV#${itemId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: vals,
    ReturnValues: "ALL_NEW"
  });

  // Write StockTransaction
  const txn = {
    PK: `INV#${itemId}`,
    SK: `TXN#${txnId}`,
    entityType: "STOCK_TRANSACTION",
    txnId, itemId, hospitalId,
    type: "STOCK_IN",
    quantity: data.quantity,
    balanceAfter: newStock,
    reason: data.reason || "Stock replenishment",
    referenceId: data.referenceId || null,
    performedBy: caller.userId,
    performedAt: timestamp
  };
  await put(txn);

  return { item: updatedItem, transaction: txn };
};

// ─── Stock-Adjust (Manual Correction) ─────────────────────────────────────────
export const stockAdjust = async (caller, hospitalId, itemId, data) => {
  const item = await getItemById(caller, hospitalId, itemId);
  const txnId = uuidv4();
  const timestamp = new Date().toISOString();
  const newStock = Math.max(0, item.currentStock + data.quantity);
  const newStatus = computeStatus(newStock, item.reorderLevel, item.expiryDate);

  const updatedItem = await update({
    PK: `HOSP#${hospitalId}`,
    SK: `INV#${itemId}`,
    UpdateExpression: "SET currentStock = :stock, #st = :status, updatedAt = :ts, updatedBy = :ub",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: { ":stock": newStock, ":status": newStatus, ":ts": timestamp, ":ub": caller.userId },
    ReturnValues: "ALL_NEW"
  });

  const txn = {
    PK: `INV#${itemId}`,
    SK: `TXN#${txnId}`,
    entityType: "STOCK_TRANSACTION",
    txnId, itemId, hospitalId,
    type: "ADJUSTMENT",
    quantity: data.quantity,
    balanceAfter: newStock,
    reason: data.reason,
    referenceId: null,
    performedBy: caller.userId,
    performedAt: timestamp
  };
  await put(txn);

  return { item: updatedItem, transaction: txn };
};

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────
export const getLowStockAlerts = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `ALERT#HOSP#${hospitalId}`, ":skPrefix": "LOW_STOCK#" }
  });
  return (result.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ─── Expiry Alerts ────────────────────────────────────────────────────────────
export const getExpiryAlerts = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new AuthError("Access denied");
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":pk": `ALERT#HOSP#${hospitalId}`, ":skPrefix": "EXPIRY#" }
  });
  return (result.Items || []).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
};
