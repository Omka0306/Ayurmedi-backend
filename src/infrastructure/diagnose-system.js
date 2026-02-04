/* Simplified diagnostic script with console output */

require('dotenv').config();

const { 
  CognitoIdentityProviderClient,
  ListUsersCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getDocumentClient } = require('../persistence/dynamodb.client');
const { AWS_REGION, USER_POOL_ID, TABLES } = require('../constants/config');

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const ddb = getDocumentClient();

const run = async () => {
  console.log('\n=== SYSTEM DIAGNOSTIC REPORT ===\n');
  
  // 1. Check Cognito Users
  console.log('1. COGNITO USER POOL:');
  console.log(`   Pool ID: ${USER_POOL_ID}`);
  try {
    const listUsersRes = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 10
      })
    );
    console.log(`   Total Users: ${listUsersRes.Users.length}`);
    listUsersRes.Users.forEach((user, idx) => {
      const email = user.Attributes.find(a => a.Name === 'email')?.Value;
      const sub = user.Attributes.find(a => a.Name === 'sub')?.Value;
      const role = user.Attributes.find(a => a.Name === 'custom:role')?.Value;
      const status = user.UserStatus;
      console.log(`   [${idx + 1}] Email: ${email}`);
      console.log(`       Role: ${role}, Status: ${status}`);
      console.log(`       Cognito Sub: ${sub}`);
    });
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // 2. Check DynamoDB Tables
  console.log('\n2. DYNAMODB TABLES:');
  try {
    const listTablesRes = await dynamoClient.send(new ListTablesCommand({}));
    console.log(`   Total Tables: ${listTablesRes.TableNames.length}`);
    console.log(`   Tables: ${listTablesRes.TableNames.join(', ')}`);
    
    // Check USERS table
    const usersTableName = TABLES.USERS;
    console.log(`\n   Checking Users Table: ${usersTableName}`);
    if (listTablesRes.TableNames.includes(usersTableName)) {
      console.log(`   ✓ Table exists`);
      
      const scanRes = await ddb.send(
        new ScanCommand({
          TableName: usersTableName,
          Limit: 10
        })
      );
      console.log(`   Total Users in DB: ${scanRes.Items.length}`);
      scanRes.Items.forEach((user, idx) => {
        console.log(`   [${idx + 1}] Email: ${user.email}`);
        console.log(`       Role: ${user.role}, Status: ${user.status}`);
        console.log(`       User ID: ${user.user_id}`);
        console.log(`       Cognito ID: ${user.cognito_user_id}`);
      });
    } else {
      console.log(`   ✗ Table DOES NOT EXIST`);
    }

    // Check HOSPITALS table
    const hospitalsTableName = TABLES.HOSPITALS;
    console.log(`\n   Checking Hospitals Table: ${hospitalsTableName}`);
    if (listTablesRes.TableNames.includes(hospitalsTableName)) {
      console.log(`   ✓ Table exists`);
    } else {
      console.log(`   ✗ Table DOES NOT EXIST`);
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }

  // 3. Environment Check
  console.log('\n3. ENVIRONMENT VARIABLES:');
  console.log(`   AWS_REGION: ${AWS_REGION}`);
  console.log(`   USER_POOL_ID: ${USER_POOL_ID}`);
  console.log(`   USER_POOL_CLIENT_ID: ${process.env.USER_POOL_CLIENT_ID}`);
  console.log(`   SUPER_ADMIN_EMAIL: ${process.env.SUPER_ADMIN_EMAIL}`);
  console.log(`   USERS_TABLE: ${TABLES.USERS}`);
  console.log(`   HOSPITALS_TABLE: ${TABLES.HOSPITALS}`);

  console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nERROR:', err.message);
    process.exit(1);
  });
