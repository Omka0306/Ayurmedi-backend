const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });

async function createTable(params) {
  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log(`✓ Created table: ${params.TableName} (${result.TableDescription.TableStatus})`);
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log(`ℹ Table already exists: ${params.TableName}`);
    } else {
      console.error(`✗ Error creating ${params.TableName}:`, err.message);
    }
  }
}

async function main() {
  // IPD Admissions Table
  await createTable({
    TableName: 'ayurmedi-backend-ipd-admissions-dev',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'ipd_id', AttributeType: 'S' },
      { AttributeName: 'hospital_id', AttributeType: 'S' },
      { AttributeName: 'patient_id', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'ipd_id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'hospital-ipd-index',
        KeySchema: [{ AttributeName: 'hospital_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'patient-ipd-index',
        KeySchema: [{ AttributeName: 'patient_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  });

  // Panchakarma Plans Table
  await createTable({
    TableName: 'ayurmedi-backend-panchakarma-plans-dev',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'plan_id', AttributeType: 'S' },
      { AttributeName: 'hospital_id', AttributeType: 'S' },
      { AttributeName: 'patient_id', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'plan_id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'hospital-pk-index',
        KeySchema: [{ AttributeName: 'hospital_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'patient-pk-index',
        KeySchema: [{ AttributeName: 'patient_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  });

  console.log('Done!');
}

main().catch(console.error);
