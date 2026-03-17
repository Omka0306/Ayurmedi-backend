const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'ap-south-1';
const STAGE = 'dev';

const TABLES = {
  HOSPITALS: `ayurmedi-backend-hospitals-${STAGE}`,
  INVENTORY_ITEMS: `ayurmedi-backend-inventory-items-${STAGE}`,
  FORM_CONFIGS: `ayurmedi-backend-form-configs-${STAGE}`,
  USERS: `ayurmedi-backend-users-${STAGE}`,
  PATIENTS: `ayurmedi-backend-patients-${STAGE}`
};

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

async function scanAll(tableName) {
  let items = [];
  let lastEvaluatedKey = undefined;
  do {
    const res = await docClient.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastEvaluatedKey }));
    items = items.concat(res.Items || []);
    lastEvaluatedKey = res.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

// Helper to determine oldest item
const getOldest = (items) => items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

async function cleanDatabase() {
  console.log('--- Starting Database Cleanup ---');
  
  const hospitals = await scanAll(TABLES.HOSPITALS);
  const byHospName = {};
  hospitals.forEach(h => { byHospName[h.name] = byHospName[h.name] || []; byHospName[h.name].push(h); });
  
  const canonicalHospitals = [];
  const deletedHospitalIds = new Set();
  
  for (const [name, items] of Object.entries(byHospName)) {
    const oldest = getOldest(items);
    canonicalHospitals.push(oldest);
    for (const item of items) {
      if (item.hospital_id !== oldest.hospital_id) {
        deletedHospitalIds.add(item.hospital_id);
        console.log(`Deleting duplicate hospital: ${item.hospital_id} (${name})`);
        await docClient.send(new DeleteCommand({ TableName: TABLES.HOSPITALS, Key: { hospital_id: item.hospital_id } }));
      }
    }
  }

  // Users
  let superAdminId = null;
  const users = await scanAll(TABLES.USERS);
  const byEmail = {};
  users.forEach(u => { byEmail[u.email] = byEmail[u.email] || []; byEmail[u.email].push(u); });
  
  for (const [email, items] of Object.entries(byEmail)) {
    const oldest = getOldest(items);
    if (oldest.role === 'SUPER_ADMIN') superAdminId = oldest.user_id;
    
    // update canonical user to valid hospital if their hospital was deleted
    if (oldest.hospital_id && deletedHospitalIds.has(oldest.hospital_id) && canonicalHospitals.length > 0) {
      const validHospital = canonicalHospitals.find(h => h.name.includes('Mitram')) || canonicalHospitals[0];
      await docClient.send(new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { user_id: oldest.user_id },
        UpdateExpression: 'SET hospital_id = :hid',
        ExpressionAttributeValues: { ':hid': validHospital.hospital_id }
      }));
    }
    
    for (const item of items) {
      if (item.user_id !== oldest.user_id) {
        console.log(`Deleting duplicate user: ${item.user_id} (${email})`);
        await docClient.send(new DeleteCommand({ TableName: TABLES.USERS, Key: { user_id: item.user_id } }));
      }
    }
  }
  
  // Inventory Items
  const inventory = await scanAll(TABLES.INVENTORY_ITEMS);
  const byHospAndItemName = {};
  
  for (const item of inventory) {
    if (deletedHospitalIds.has(item.hospital_id)) {
      console.log(`Deleting orphaned inventory item: ${item.item_id}`);
      await docClient.send(new DeleteCommand({ TableName: TABLES.INVENTORY_ITEMS, Key: { item_id: item.item_id } }));
    } else {
      const k = `${item.hospital_id}::${item.name}`;
      byHospAndItemName[k] = byHospAndItemName[k] || [];
      byHospAndItemName[k].push(item);
    }
  }
  
  for (const [k, items] of Object.entries(byHospAndItemName)) {
    if (items.length > 1) {
      const oldest = getOldest(items);
      for (const item of items) {
        if (item.item_id !== oldest.item_id) {
          console.log(`Deleting duplicate inventory item: ${item.item_id} (${item.name})`);
          await docClient.send(new DeleteCommand({ TableName: TABLES.INVENTORY_ITEMS, Key: { item_id: item.item_id } }));
        }
      }
    }
  }

  // Form Configs
  const forms = await scanAll(TABLES.FORM_CONFIGS);
  for (const f of forms) {
    if (deletedHospitalIds.has(f.hospital_id)) {
      console.log(`Deleting orphaned form config: ${f.form_type} (Hospital: ${f.hospital_id})`);
      await docClient.send(new DeleteCommand({ TableName: TABLES.FORM_CONFIGS, Key: { hospital_id: f.hospital_id, form_type: f.form_type } }));
    }
  }
  
  // Patients
  const patients = await scanAll(TABLES.PATIENTS);
  for (const p of patients) {
    if (deletedHospitalIds.has(p.hospital_id)) {
      console.log(`Deleting orphaned patient: ${p.patient_id}`);
      await docClient.send(new DeleteCommand({ TableName: TABLES.PATIENTS, Key: { patient_id: p.patient_id } }));
    }
  }

  console.log('--- Database Cleanup Complete ---');
}

cleanDatabase().catch(console.error);
