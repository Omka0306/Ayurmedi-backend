const inventorySvc = require('../services/inventory.service');

const addStock = async (payload, context) => {
  return inventorySvc.addStock(payload, context);
};

const getMedicineStock = async (medicineId, context) => {
  return inventorySvc.getMedicineStock(medicineId, context.hospital_id);
};

const listStock = async (options, context) => {
  return inventorySvc.listStock(options, context);
};

const getLowStock = async (context) => {
  return inventorySvc.getLowStock(context);
};

const adjustInventory = async (inventoryId, payload, context) => {
  return inventorySvc.adjustInventory(inventoryId, payload, context);
};

module.exports = {
  addStock,
  getMedicineStock,
  listStock,
  getLowStock,
  adjustInventory,
};
