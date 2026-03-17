try {
  const handler = require('./src/handlers/hospital.handler.js');
  console.log('Successfully loaded handler!');
} catch (err) {
  console.error('Failed to load handler:', err);
}
