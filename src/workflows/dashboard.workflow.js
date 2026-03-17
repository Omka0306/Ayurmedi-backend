const dashboardService = require('../services/dashboard.service');
module.exports = {
  summary:   (ctx)       => dashboardService.getTodaySummary(ctx.hospital_id),
  analytics: (ctx, days) => dashboardService.getAnalytics(ctx.hospital_id, days),
};
