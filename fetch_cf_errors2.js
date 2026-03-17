const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Fetching stack events...");
  const rawLog = execSync('aws cloudformation describe-stack-events --stack-name ayurmedi-backend-dev --output json').toString();
  fs.writeFileSync('cf_events.json', rawLog);
  console.log("Wrote raw events to cf_events.json");
  
  const events = JSON.parse(rawLog);
  const clientEvents = events.StackEvents.filter(e => e.LogicalResourceId === 'AyurmediUserPoolClient' && e.ResourceStatus === 'CREATE_FAILED');
  
  if (clientEvents.length > 0) {
    fs.writeFileSync('client_error.txt', clientEvents[0].ResourceStatusReason);
    console.log("Wrote specific error to client_error.txt");
  } else {
    console.log("No CREATE_FAILED events found for AyurmediUserPoolClient");
  }
} catch (e) {
  console.error("Script failed:", e.message);
}
