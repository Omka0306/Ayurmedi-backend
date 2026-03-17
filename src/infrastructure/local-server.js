/* Local API Server for Testing (without AWS deployment)
 * 
 * This simple Express server allows you to test APIs locally
 * without deploying to AWS API Gateway
 * 
 * Usage:
 *   npm install express cors
 *   node src/infrastructure/local-server.js
 * 
 * Then test with Postman at: http://localhost:3000
 */

require('dotenv').config();
const express = require('express');
const router = require('../handlers/router');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Convert Express request to Lambda event format
const toLambdaEvent = (req) => {
  return {
    httpMethod: req.method,
    path: req.path,
    rawPath: req.path,
    headers: req.headers,
    queryStringParameters: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    rawQueryString: req.originalUrl && req.originalUrl.includes('?') ? req.originalUrl.split('?').slice(1).join('?') : '',
    body: req.body ? JSON.stringify(req.body) : null,
    requestContext: {
      http: {
        method: req.method,
        path: req.path
      }
    }
  };
};

// Convert Lambda response to Express response
const fromLambdaResponse = (lambdaResponse, res) => {
  res.status(lambdaResponse.statusCode);
  
  if (lambdaResponse.headers) {
    Object.keys(lambdaResponse.headers).forEach(key => {
      res.set(key, lambdaResponse.headers[key]);
    });
  }
  
  if (lambdaResponse.body) {
    try {
      const body = JSON.parse(lambdaResponse.body);
      res.json(body);
    } catch {
      res.send(lambdaResponse.body);
    }
  } else {
    res.end();
  }
};

// Handle all routes through the Lambda router
app.all('*', async (req, res) => {
  try {
    const lambdaEvent = toLambdaEvent(req);
    const lambdaResponse = await router.handler(lambdaEvent, {});
    fromLambdaResponse(lambdaResponse, res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal Server Error',
        details: error.message
      }
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('   Ayurmedi Backend - Local Test Server');
  console.log('   ========================================');
  console.log('');
  console.log(`   Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('   Available endpoints:');
  console.log('   - POST /auth/login');
  console.log('   - POST /auth/logout');
  console.log('   - POST /auth/forgot-password');
  console.log('   - POST /auth/reset-password');
  console.log('   - POST /hospital/register');
  console.log('   - POST /user/create');
  console.log('');
  console.log('   📝 Update Postman baseUrl to:');
  console.log(`      http://localhost:${PORT}`);
  console.log('');
  console.log('   Press Ctrl+C to stop');
  console.log('========================================');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(
      `Port ${PORT} is already in use. Either stop the process using it or set a different PORT in .env (example: PORT=3001).`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
