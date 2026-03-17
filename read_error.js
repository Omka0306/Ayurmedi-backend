const fs = require('fs');
const text = fs.readFileSync('client_error.txt', 'utf8');
// Write each character to stderr without wrapping
process.stderr.write('LENGTH: ' + text.length + '\n');
process.stderr.write('FULL ERROR:\n' + text + '\n');
