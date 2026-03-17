const logger = require('../utils/logger.util');

// Domain handlers (mirrors serverless.yml)
const authHandler = require('./auth.handler');
const hospitalHandler = require('./hospital.handler');
const branchHandler = require('./branch.handler');
const userHandler = require('./user.handler');
const patientHandler = require('./patient.handler');
const formConfigHandler = require('./form-config.handler');
const consultationHandler = require('./consultation.handler');
const prescriptionHandler = require('./prescription.handler');
const panchakarmaHandler = require('./panchakarma.handler');
const tokenHandler = require('./token.handler');
const billingHandler = require('./billing.handler');
const inventoryHandler = require('./inventory.handler');
const reportHandler = require('./report.handler');
const dashboardHandler = require('./dashboard.handler');

/**
 * Minimal route matcher for local testing.
 * Supports API Gateway-style templates like /hospitals/{id}.
 */
const compileRoute = (template) => {
  const paramNames = [];
  const pattern = template
    .split('/')
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\{(.+)\}$/);
      if (m) {
        paramNames.push(m[1]);
        return '([^/]+)';
      }
      // Escape regex meta in static segments
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return {
    template,
    paramNames,
    regex: new RegExp(`^/${pattern}$`),
  };
};

const ROUTES = [
  // Auth
  { method: 'POST', path: '/auth/login', fn: authHandler.login },
  { method: 'POST', path: '/auth/logout', fn: authHandler.logout },
  { method: 'POST', path: '/auth/forgot-password', fn: authHandler.forgotPassword },
  { method: 'POST', path: '/auth/reset-password', fn: authHandler.resetPassword },

  // Hospitals
  { method: 'POST', path: '/hospitals/register', fn: hospitalHandler.register },
  { method: 'GET', path: '/hospitals/{id}', fn: hospitalHandler.getHospital },
  { method: 'GET', path: '/hospitals', fn: hospitalHandler.listHospitals },

  // Backward-compatible local-only aliases
  { method: 'POST', path: '/hospital/register', fn: hospitalHandler.register },
  { method: 'POST', path: '/user/create', fn: userHandler.create },

  // Branches
  { method: 'POST', path: '/hospitals/{hospitalId}/branches', fn: branchHandler.create },
  { method: 'GET', path: '/hospitals/{hospitalId}/branches', fn: branchHandler.list },
  { method: 'PUT', path: '/branches/{id}', fn: branchHandler.update },

  // Users
  { method: 'POST', path: '/users', fn: userHandler.create },
  { method: 'GET', path: '/users', fn: userHandler.list },
  { method: 'GET', path: '/users/{id}', fn: userHandler.get },
  { method: 'PUT', path: '/users/{id}', fn: userHandler.update },
  { method: 'DELETE', path: '/users/{id}', fn: userHandler.remove },

  // Patients
  { method: 'POST', path: '/patients', fn: patientHandler.create },
  { method: 'GET', path: '/patients', fn: patientHandler.list },
  { method: 'GET', path: '/patients/search', fn: patientHandler.search },
  { method: 'GET', path: '/patients/{id}', fn: patientHandler.get },
  { method: 'PUT', path: '/patients/{id}', fn: patientHandler.update },

  // Form Configs
  { method: 'GET', path: '/forms/config/{formType}', fn: formConfigHandler.get },
  { method: 'PUT', path: '/forms/config/{formType}', fn: formConfigHandler.save },
  { method: 'GET', path: '/forms/config', fn: formConfigHandler.list },

  // Consultations
  { method: 'POST', path: '/consultations', fn: consultationHandler.create },
  { method: 'GET', path: '/consultations/{id}', fn: consultationHandler.get },
  { method: 'PUT', path: '/consultations/{id}', fn: consultationHandler.update },
  { method: 'GET', path: '/patients/{patientId}/consultations', fn: consultationHandler.listByPatient },

  // Prescriptions
  { method: 'POST', path: '/prescriptions', fn: prescriptionHandler.create },
  { method: 'GET', path: '/prescriptions/{id}', fn: prescriptionHandler.get },
  { method: 'GET', path: '/patients/{patientId}/prescriptions', fn: prescriptionHandler.listByPatient },

  // Panchakarma
  { method: 'POST', path: '/panchakarma/plans', fn: panchakarmaHandler.createPlan },
  { method: 'GET', path: '/panchakarma/plans/{id}', fn: panchakarmaHandler.getPlan },
  { method: 'GET', path: '/patients/{patientId}/panchakarma', fn: panchakarmaHandler.listByPatient },
  { method: 'POST', path: '/panchakarma/plans/{id}/sessions', fn: panchakarmaHandler.addSession },
  { method: 'GET', path: '/panchakarma/plans/{id}/sessions', fn: panchakarmaHandler.listSessions },
  { method: 'PUT', path: '/panchakarma/sessions/{sessionId}', fn: panchakarmaHandler.updateSession },

  // Token / Queue
  { method: 'POST', path: '/tokens', fn: tokenHandler.create },
  { method: 'GET', path: '/tokens/queue', fn: tokenHandler.getQueue },
  { method: 'PUT', path: '/tokens/{id}/status', fn: tokenHandler.updateStatus },
  { method: 'GET', path: '/tokens/display', fn: tokenHandler.display },

  // Billing
  { method: 'POST', path: '/billing', fn: billingHandler.create },
  { method: 'GET', path: '/billing/{id}', fn: billingHandler.get },
  { method: 'PUT', path: '/billing/{id}/payment', fn: billingHandler.recordPayment },
  { method: 'GET', path: '/patients/{patientId}/bills', fn: billingHandler.listByPatient },

  // Inventory
  { method: 'POST', path: '/inventory/items', fn: inventoryHandler.createItem },
  { method: 'GET', path: '/inventory/items', fn: inventoryHandler.listItems },
  { method: 'GET', path: '/inventory/items/{id}', fn: inventoryHandler.getItem },
  { method: 'PUT', path: '/inventory/items/{id}', fn: inventoryHandler.updateItem },
  { method: 'POST', path: '/inventory/stock-in', fn: inventoryHandler.stockIn },
  { method: 'POST', path: '/inventory/stock-adjust', fn: inventoryHandler.stockAdjust },
  { method: 'GET', path: '/inventory/alerts/low-stock', fn: inventoryHandler.lowStockAlerts },
  { method: 'GET', path: '/inventory/alerts/expiry', fn: inventoryHandler.expiryAlerts },

  // Reports
  { method: 'GET', path: '/reports/daily-opd', fn: reportHandler.dailyOpd },
  { method: 'GET', path: '/reports/revenue', fn: reportHandler.revenue },
  { method: 'GET', path: '/reports/inventory-usage', fn: reportHandler.inventoryUsage },
  { method: 'GET', path: '/reports/low-stock', fn: reportHandler.lowStock },
  { method: 'GET', path: '/patients/{patientId}/report', fn: reportHandler.patientHistory },

  // Dashboard
  { method: 'GET', path: '/dashboard/summary', fn: dashboardHandler.summary },
  { method: 'GET', path: '/dashboard/analytics', fn: dashboardHandler.analytics },
].map((r) => ({ ...r, compiled: compileRoute(r.path) }));

module.exports.handler = async (event, context) => {
  const path = event.rawPath || event.path;
  const method = event.requestContext?.http?.method || event.httpMethod;

  logger.info('Incoming request', {
    path,
    method,
    query: event.queryStringParameters,
  });

  const match = ROUTES.find(
    (r) => r.method === method && r.compiled.regex.test(path),
  );

  if (!match) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Route not found' }),
    };
  }

  const m = path.match(match.compiled.regex);
  const pathParameters = {};
  if (m && match.compiled.paramNames.length > 0) {
    match.compiled.paramNames.forEach((name, idx) => {
      pathParameters[name] = m[idx + 1];
    });
  }

  // Handlers expect API Gateway-like params
  event.pathParameters = { ...(event.pathParameters || {}), ...pathParameters };

  return match.fn(event, context);
};

