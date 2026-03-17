const reportService = require('../services/report.service');
module.exports = {
  dailyOpd:       (ctx, date)        => reportService.getDailyOpdReport(ctx.hospital_id, date),
  revenue:        (ctx, from, to)    => reportService.getRevenueReport(ctx.hospital_id, from, to),
  inventoryUsage: (ctx, from, to)    => reportService.getInventoryUsageReport(ctx.hospital_id, from, to),
  lowStock:       (ctx)              => reportService.getLowStockReport(ctx.hospital_id),
  patientHistory: (patientId, ctx)   => reportService.getPatientHistoryReport(patientId, ctx.hospital_id),
};
