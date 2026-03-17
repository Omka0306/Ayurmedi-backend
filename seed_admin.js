const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const region = 'ap-south-1';
const userPoolId = 'ap-south-1_Tf9ZC2mZN';
const usersTable = 'ayurmedi-backend-users-dev';

const cognito = new CognitoIdentityProviderClient({ region });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function seedSuperAdmin() {
  const email = 'superadmin@ayurmedi.test';
  const password = 'SuperAdminPassword@123';
  const userId = crypto.randomUUID();

  console.log(`Creating SUPER_ADMIN: ${email}`);

  try {
    // 1. Create in Cognito
    let cognitoSub = '';
    try {
      const createRes = await cognito.send(new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: 'SUPER_ADMIN' }
        ],
        MessageAction: 'SUPPRESS'
      }));
      cognitoSub = createRes.User.Attributes.find(a => a.Name === 'sub').Value;
    } catch (err) {
      if (err.name !== 'UsernameExistsException') throw err;
      console.log('User already exists in Cognito');
      const { AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
      const getRes = await cognito.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email
      }));
      cognitoSub = getRes.UserAttributes.find(a => a.Name === 'sub').Value;
    }

    // 2. Set password permanently
    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true
    }));
    console.log('Password set permanently in Cognito');

    // 3. Create in DynamoDB
    await docClient.send(new PutCommand({
      TableName: usersTable,
      Item: {
        user_id: userId,
        cognito_user_id: cognitoSub,
        email: email,
        full_name: 'System Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    console.log('Created user record in DynamoDB');

    console.log('\nSuccess! You can now login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (err) {
    console.error('Error seeding super admin:', err);
  }
}

seedSuperAdmin();
