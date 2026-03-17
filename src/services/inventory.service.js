const {
  createItem, getItemById, listItemsByHospital, updateItem, adjustStock,
  addStockMovement, listMovementsByItem, listLowStockItems, listExpiringItems,
} = require('../persistence/inventory.repo');
const { STOCK_MOVEMENT, INVENTORY_CATEGORY } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const addItem = async (payload, authContext) => {
  const { name, category, unit } = payload;
  if (!name || !category || !unit)
    throw new AppError('name, category, and unit are required', { statusCode: 400, code: 'VALIDATION_ERROR' });
  if (!Object.values(INVENTORY_CATEGORY).includes(category))
    throw new AppError('Invalid category', { statusCode: 400, code: 'VALIDATION_ERROR' });
  return createItem({ ...payload, hospital_id: authContext.hospital_id });
};

const getItem = async (itemId, hospitalId) => {
  const item = await getItemById(itemId);
  if (!item) throw new AppError('Item not found', { statusCode: 404, code: 'NOT_FOUND' });
  if (item.hospital_id !== hospitalId) throw new AppError('Access denied', { statusCode: 403, code: 'FORBIDDEN' });
  return item;
};

const listItems = async (hospitalId, pagination) => listItemsByHospital(hospitalId, pagination);

const modifyItem = async (itemId, updates, hospitalId) => {
  const existing = await getItemById(itemId);
  if (!existing || existing.hospital_id !== hospitalId)
    throw new AppError('Item not found', { statusCode: 404, code: 'NOT_FOUND' });
  const disallowed = ['item_id', 'hospital_id', 'current_stock', 'created_at'];
  disallowed.forEach((k) => delete updates[k]);
  return updateItem(itemId, updates);
};

const receiveStock = async (payload, authContext) => {
  const { item_id, quantity, supplier_name, batch_no, expiry_date, purchase_price } = payload;
  if (!item_id || !quantity || quantity <= 0)
    throw new AppError('item_id and positive quantity are required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const item = await getItemById(item_id);
  if (!item || item.hospital_id !== authContext.hospital_id)
    throw new AppError('Item not found', { statusCode: 404, code: 'NOT_FOUND' });

  const [updated] = await Promise.all([
    adjustStock(item_id, quantity, authContext.hospital_id),
    addStockMovement({
      item_id, hospital_id: authContext.hospital_id,
      movement_type: STOCK_MOVEMENT.PURCHASE,
      quantity, supplier_name, batch_no, expiry_date, purchase_price,
      created_by: authContext.user.user_id,
    }),
  ]);

  // Update expiry/batch on item if provided
  if (expiry_date || batch_no) {
    await updateItem(item_id, {
      ...(expiry_date ? { expiry_date } : {}),
      ...(batch_no ? { batch_no } : {}),
      ...(purchase_price ? { purchase_price } : {}),
    });
  }

  return updated;
};

const manualAdjustment = async (payload, authContext) => {
  const { item_id, delta, reason } = payload;
  if (!item_id || delta === undefined || delta === 0)
    throw new AppError('item_id and non-zero delta are required', { statusCode: 400, code: 'VALIDATION_ERROR' });

  const item = await getItemById(item_id);
  if (!item || item.hospital_id !== authContext.hospital_id)
    throw new AppError('Item not found', { statusCode: 404, code: 'NOT_FOUND' });

  const [updated] = await Promise.all([
    adjustStock(item_id, delta, authContext.hospital_id),
    addStockMovement({
      item_id, hospital_id: authContext.hospital_id,
      movement_type: STOCK_MOVEMENT.ADJUSTMENT,
      quantity: Math.abs(delta),
      notes: reason || 'Manual adjustment',
      created_by: authContext.user.user_id,
    }),
  ]);
  return updated;
};

const getLowStockAlerts = async (hospitalId) => listLowStockItems(hospitalId);

const getExpiryAlerts = async (hospitalId, daysAhead = 90) => {
  const beforeDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
  return listExpiringItems(hospitalId, beforeDate);
};

module.exports = {
  addItem, getItem, listItems, modifyItem,
  receiveStock, manualAdjustment,
  getLowStockAlerts, getExpiryAlerts,
};
