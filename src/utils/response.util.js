const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body ?? {}),
});

module.exports = {
  ok: (data) => buildResponse(200, { success: true, data }),
  created: (data) => buildResponse(201, { success: true, data }),
  noContent: () => ({
    statusCode: 204,
    headers: {},
    body: '',
  }),
  badRequest: (message, details) =>
    buildResponse(400, { success: false, message, details }),
  unauthorized: (message = 'Unauthorized') =>
    buildResponse(401, { success: false, message }),
  forbidden: (message = 'Forbidden') =>
    buildResponse(403, { success: false, message }),
  notFound: (message = 'Not Found') =>
    buildResponse(404, { success: false, message }),
  serverError: (message = 'Internal Server Error', details) =>
    buildResponse(500, { success: false, message, details }),
};

