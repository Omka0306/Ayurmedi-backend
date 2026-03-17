const { execSync } = require('child_process');
const fs = require('fs');

const rawLog = execSync('aws cloudformation describe-stack-events --stack-name ayurmedi-backend-dev --output json').toString();
const events = JSON.parse(rawLog);

const failedEvents = events.StackEvents.filter(e => e.ResourceStatus === 'CREATE_FAILED' || e.ResourceStatus === 'UPDATE_FAILED' || e.ResourceStatus === 'ROLLBACK_IN_PROGRESS');

fs.writeFileSync('all_failures.json', JSON.stringify(failedEvents.map(e => ({
  id: e.LogicalResourceId,
  type: e.ResourceType,
  status: e.ResourceStatus,
  reason: e.ResourceStatusReason
})), null, 2));

console.log('Wrote', failedEvents.length, 'failed events to all_failures.json');
failedEvents.slice(0, 10).forEach(e => {
  console.log(`\n[${e.ResourceStatus}] ${e.LogicalResourceId} (${e.ResourceType})\n  => ${e.ResourceStatusReason}`);
});
