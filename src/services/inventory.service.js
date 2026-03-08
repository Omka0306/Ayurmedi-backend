const { AppError } = require('../utils/error.util');
const {
  stockIn,
  getInventoryById,
  getInventoryByMedicine,
  listInventoryByHospital,
  deductStock,
  adjustStock,
} = require('../persistence/inventory.repo');

const LOW_STOCK_THRESHOLD = 10; // configurable

/**
 * Add stock for a medicine (purchase / stock received)
 */
const addStock = async (payload, { hospital_id }) => {
  const { medicine_id, quantity, unit_cost, batch_no, expiry_date, notes } = payload;

  if (!medicine_id || !quantity || quantity <= 0) {
    throw new AppError('medicine_id and a positive quantity are required', { statusCode: 400 });
  }

  const inv = await stockIn(hospital_id, medicine_id, { quantity, unit_cost, batch_no, expiry_date, notes });
  return inv;
};

/**
 * Get inventory for one medicine in hospital
 */
const getMedicineStock = async (medicineId, hospitalId) => {
  const inv = await getInventoryByMedicine(hospitalId, medicineId);
  if (!inv) {
    return { stock: null, message: 'No inventory record found for this medicine' };
  }
  return {
    ...inv,
    is_low_stock: inv.quantity <= LOW_STOCK_THRESHOLD,
  };
};

/**
 * List all inventory for a hospital, flagging low-stock items
 */
const listStock = async (options, { hospital_id }) => {
  const result = await listInventoryByHospital(hospital_id, options);
  const items = result.items.map((inv) => ({
    ...inv,
    is_low_stock: inv.quantity <= LOW_STOCK_THRESHOLD,
  }));
  return { ...result, items };
};

/**
 * Get only low-stock items for a hospital
 */
const getLowStock = async ({ hospital_id }) => {
  const result = await listInventoryByHospital(hospital_id, { limit: 200 });
  const lowStockItems = result.items.filter((inv) => inv.quantity <= LOW_STOCK_THRESHOLD);
  return { items: lowStockItems, count: lowStockItems.length };
};

/**
 * Manual stock adjustment (e.g. expired items removal, correction)
 */
const adjustInventory = async (inventoryId, payload, { hospital_id }) => {
  const inv = await getInventoryById(inventoryId);
  if (!inv) throw new AppError('Inventory record not found', { statusCode: 404 });
  if (inv.hospital_id !== hospital_id) throw new AppError('Access denied', { statusCode: 403 });

  const { adjustment, reason } = payload;
  if (adjustment === undefined || adjustment === 0) {
    throw new AppError('adjustment (positive or negative number) is required', { statusCode: 400 });
  }

  const updated = await adjustStock(inventoryId, { adjustment, reason });
  return updated;
};

module.exports = {
  addStock,
  getMedicineStock,
  listStock,
  getLowStock,
  adjustInventory,
  deductStock, // exported for use in prescription service
};
