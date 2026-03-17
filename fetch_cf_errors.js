const { execSync } = require('child_process');

try {
  const result = execSync('aws cloudformation describe-stack-events --stack-name ayurmedi-backend-dev --output json');
  const events = JSON.parse(result.toString());
  const clientEvents = events.StackEvents.filter(e => e.LogicalResourceId === 'AyurmediUserPoolClient' && e.ResourceStatus === 'CREATE_FAILED');
  console.log("ERRORS:", JSON.stringify(clientEvents.map(e => e.ResourceStatusReason), null, 2));
} catch (e) {
  console.error("Script failed:", e.message);
}
