// Thin wrapper so AWS Lambda can use handler string 'src/handlers/auth.login'
// without being confused by extra dots in filename.
module.exports = require('./auth.handler');

