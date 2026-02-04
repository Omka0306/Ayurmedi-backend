const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { AWS_REGION, USER_POOL_ID, USER_POOL_CLIENT_ID } = require('../constants/config');
const { AppError } = require('../utils/error.util');

const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

const ensureEnv = () => {
  if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
    throw new AppError('Cognito environment not configured', {
      statusCode: 500,
      code: 'COGNITO_ENV_MISSING',
    });
  }
};

const getUserByEmail = async (email) => {
  ensureEnv();

  const res = await client.send(
    new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }),
  );

  const sub =
    (res.UserAttributes || []).find((a) => a.Name === 'sub')?.Value || null;

  return {
    username: res.Username,
    sub,
  };
};

const adminCreateUserWithPassword = async ({
  email,
  tempPassword,
  permanentPassword,
  name,
  role,
  hospital_id,
  branch_id,
}) => {
  ensureEnv();

  // Create user
  const createRes = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        { Name: 'custom:hospital_id', Value: hospital_id || '' },
        { Name: 'custom:role', Value: role || '' },
        { Name: 'custom:branch_id', Value: branch_id || '' },
      ],
      TemporaryPassword: tempPassword,
      MessageAction: 'SUPPRESS',
    }),
  );

  const username = createRes.User.Username;

  // Set permanent password
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      Password: permanentPassword,
      Permanent: true,
    }),
  );

  return {
    username,
    sub:
      (createRes.User.Attributes || []).find((a) => a.Name === 'sub')?.Value ||
      null,
  };
};

const login = async ({ email, password }) => {
  ensureEnv();

  try {
    const res = await client.send(
      new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    return {
      accessToken: res.AuthenticationResult.AccessToken,
      idToken: res.AuthenticationResult.IdToken,
      refreshToken: res.AuthenticationResult.RefreshToken,
      expiresIn: res.AuthenticationResult.ExpiresIn,
      tokenType: res.AuthenticationResult.TokenType,
    };
  } catch (err) {
    // Handle specific Cognito errors
    if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
      throw new AppError('Invalid email or password', {
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        details: err.message,
      });
    }
    // Re-throw AppError as-is
    if (err instanceof AppError) {
      throw err;
    }
    // Wrap other errors
    throw new AppError('Authentication failed', {
      statusCode: 500,
      code: 'AUTH_ERROR',
      details: err.message,
    });
  }
};

// For this phase we keep logout as a logical no-op – clients should discard tokens.
const logout = async () => {
  return { success: true };
};

const forgotPassword = async ({ email }) => {
  ensureEnv();

  await client.send(
    new ForgotPasswordCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
    }),
  );
};

const resetPassword = async ({ email, confirmationCode, newPassword }) => {
  ensureEnv();

  await client.send(
    new ConfirmForgotPasswordCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    }),
  );
};

module.exports = {
  adminCreateUserWithPassword,
  getUserByEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
};

