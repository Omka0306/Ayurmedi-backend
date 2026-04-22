const fs = require('fs');
let lines = fs.readFileSync('serverless.base.yml', 'utf8').split('\n');

let resIdx = lines.findIndex(l => l.startsWith('Resources:'));
if (resIdx === -1) {
    console.log("Could not find Resources:");
    process.exit(1);
}

let before = lines.slice(0, resIdx);
let after = lines.slice(resIdx);

let newAfter = ['resources:'].concat(after.map(l => {
    if (l.trim() === '') return l;
    return '  ' + l;
}));

fs.writeFileSync('serverless.base.yml', before.concat(newAfter).join('\n'));
console.log("Fixed serverless.base.yml!");
