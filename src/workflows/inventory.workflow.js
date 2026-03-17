const inventoryService = require('../services/inventory.service');
module.exports = {
  createItem:      (body, ctx) => inventoryService.addItem(body, ctx),
  getItem:         (id, ctx)   => inventoryService.getItem(id, ctx.hospital_id),
  listItems:       (ctx, pag)  => inventoryService.listItems(ctx.hospital_id, pag),
  updateItem:      (id, body, ctx) => inventoryService.modifyItem(id, body, ctx.hospital_id),
  stockIn:         (body, ctx) => inventoryService.receiveStock(body, ctx),
  stockAdjust:     (body, ctx) => inventoryService.manualAdjustment(body, ctx),
  lowStockAlerts:  (ctx)       => inventoryService.getLowStockAlerts(ctx.hospital_id),
  expiryAlerts:    (ctx, days) => inventoryService.getExpiryAlerts(ctx.hospital_id, days),
};
