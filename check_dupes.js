const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'ap-south-1';
const STAGE = 'dev';

const TABLES = {
  HOSPITALS: `ayurmedi-backend-hospitals-${STAGE}`,
  INVENTORY_ITEMS: `ayurmedi-backend-inventory-items-${STAGE}`,
  FORM_CONFIGS: `ayurmedi-backend-form-configs-${STAGE}`,
  USERS: `ayurmedi-backend-users-${STAGE}`,
  TOKENS: `ayurmedi-backend-tokens-${STAGE}`,
  PATIENTS: `ayurmedi-backend-patients-${STAGE}`,
  CONSULTATIONS: `ayurmedi-backend-consultations-${STAGE}`,
  PRESCRIPTIONS: `ayurmedi-backend-prescriptions-${STAGE}`
};

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

async function scanAll(tableName) {
  let items = [];
  let lastEvaluatedKey = undefined;
  do {
    const res = await docClient.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey
    }));
    items = items.concat(res.Items || []);
    lastEvaluatedKey = res.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

async function checkDuplicates() {
  for (const [key, t] of Object.entries(TABLES)) {
    try {
      const items = await scanAll(t);
      console.log(`Table ${t}: ${items.length} total items`);
      
      if (key === 'HOSPITALS') {
        const byName = {};
        for(let item of items) {
          byName[item.name] = byName[item.name] || [];
          byName[item.name].push(item.hospital_id);
        }
        for (const [name, ids] of Object.entries(byName)) {
          if (ids.length > 1) {
            console.log(`  Duplicate Hospital: "${name}" has ${ids.length} entries`);
          }
        }
      }
      if (key === 'INVENTORY_ITEMS') {
        const byNameAndHospital = {};
        for(let item of items) {
          const k = `${item.hospital_id}::${item.name}`;
          byNameAndHospital[k] = byNameAndHospital[k] || [];
          byNameAndHospital[k].push(item.item_id);
        }
        let dupeGroups = 0;
        let totalDupes = 0;
        for (const [k, ids] of Object.entries(byNameAndHospital)) {
          if (ids.length > 1) {
            dupeGroups++;
            totalDupes += (ids.length - 1);
          }
        }
        if (dupeGroups > 0) {
          console.log(`  Found ${dupeGroups} medicines with duplicates (Total ${totalDupes} duplicate rows to remove).`);
        }
      }
      if (key === 'USERS') {
         const byEmail = {};
         for (let item of items) {
           byEmail[item.email] = byEmail[item.email] || [];
           byEmail[item.email].push(item.user_id);
         }
         for (const [email, ids] of Object.entries(byEmail)) {
           if (ids.length > 1) {
             console.log(`  Duplicate User Email: "${email}" has ${ids.length} entries`);
           }
         }
      }
      if (key === 'FORM_CONFIGS') {
         const byHospAndForm = {};
         for (let item of items) {
           const k = `${item.hospital_id}::${item.form_type}`;
           byHospAndForm[k] = byHospAndForm[k] || [];
           byHospAndForm[k].push(`${item.hospital_id}::${item.form_type}`);
         }
         let dupes = 0;
         for (const [k, arr] of Object.entries(byHospAndForm)) {
           if (arr.length > 1) dupes += (arr.length - 1);
         }
         if (dupes > 0) console.log(`  Duplicate form configs: ${dupes}`);
      }
    } catch(err) {
      console.error(`Error scanning ${t}: ${err.message}`);
    }
  }
}

checkDuplicates();
