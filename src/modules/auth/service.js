import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { put } from "../../common/db.js";
import { logChange } from "../../common/auditLogger.js";
import { ConflictError, AuthError } from "../../common/errors.js";
import { seedDefaultForms } from "../forms/service.js";

const isOffline =
  process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true";

// Use globalThis so the store persists across Lambda invocations in serverless-offline
if (!globalThis._mockUserStore) globalThis._mockUserStore = new Map();
const mockUserStore = globalThis._mockUserStore; // email -> { sub, hospitalId, role, password }

const cognitoMock = {
  send: async (command) => {
    const cmdName = command.constructor.name;
    if (cmdName === "AdminCreateUserCommand") {
      const sub = uuidv4();
      const username = command.input.Username;
      const hospitalId =
        command.input.UserAttributes?.find(
          (a) => a.Name === "custom:hospitalId",
        )?.Value || uuidv4();
      const role =
        command.input.UserAttributes?.find((a) => a.Name === "custom:role")
          ?.Value || "SUPER_ADMIN";
      // Store in globalThis as fallback
      if (!globalThis._mockUserStore) globalThis._mockUserStore = new Map();
      globalThis._mockUserStore.set(username, { sub, hospitalId, role });
      return {
        User: { Username: username, Attributes: [{ Name: "sub", Value: sub }] },
      };
    }
    if (
      cmdName === "AdminSetUserPasswordCommand" ||
      cmdName === "AdminAddUserToGroupCommand"
    ) {
      return {};
    }
    if (cmdName === "InitiateAuthCommand") {
      const authFlow = command.input.AuthFlow;
      const authParams = command.input.AuthParameters;

      // Handle refresh token flow
      if (authFlow === "REFRESH_TOKEN_AUTH" || authFlow === "REFRESH_TOKEN") {
        const refreshToken = authParams?.REFRESH_TOKEN;
        if (refreshToken === "expired") {
          throw Object.assign(new Error("Session expired"), {
            name: "NotAuthorizedException",
          });
        }
        // Return a mock access token for valid refresh tokens
        return {
          AuthenticationResult: {
            AccessToken: "access",
            RefreshToken: refreshToken,
            IdToken: "id.mock",
            ExpiresIn: 3600,
          },
        };
      }

      // Handle USER_PASSWORD_AUTH flow
      const email = authParams?.USERNAME;
      const password = authParams?.PASSWORD;

      // Check for wrong password
      if (password === "wrong") {
        throw Object.assign(new Error("Invalid credentials"), {
          name: "NotAuthorizedException",
        });
      }

      // Look up user from memDb (shared in-process store)
      const { scan } = await import("../../common/db.js");
      const result = await scan({});
      const userItem = result.Items?.find(
        (i) => i.entityType === "USER" && i.email === email,
      );
      if (!userItem) {
        throw Object.assign(new Error("User not found"), {
          name: "NotAuthorizedException",
        });
      }
      const payload = {
        sub: userItem.userId || userItem.PK?.replace("USER#", ""),
        "custom:hospitalId": userItem.hospitalId,
        "custom:role": userItem.role || "SUPER_ADMIN",
      };
      const token = jwt.sign(payload, "supersecret-mock-key", {
        algorithm: "HS256",
        expiresIn: "1h",
      });
      return {
        AuthenticationResult: {
          AccessToken: "access",
          RefreshToken: `mock-refresh-${uuidv4()}`,
          IdToken: token,
          ExpiresIn: 3600,
        },
      };
    }
    if (cmdName === "GlobalSignOutCommand") {
      return {};
    }
    if (cmdName === "ChangePasswordCommand") {
      if (command.input.PreviousPassword === "wrong") {
        throw Object.assign(new Error("Invalid credentials"), {
          name: "NotAuthorizedException",
        });
      }
      return {};
    }
    return {};
  },
};

export const cognito = isOffline
  ? cognitoMock
  : new CognitoIdentityProviderClient({});
export const registerHospital = async (data) => {
  const hospitalId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    // Create Cognito User
    const userResponse = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: data.adminEmail,
        UserAttributes: [
          { Name: "email", Value: data.adminEmail },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:hospitalId", Value: hospitalId },
          { Name: "custom:role", Value: "SUPER_ADMIN" },
        ],
        MessageAction: "SUPPRESS",
      }),
    );

    const subAttr = userResponse.User.Attributes.find((a) => a.Name === "sub");
    const userId = subAttr ? subAttr.Value : userResponse.User.Username;

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: data.adminEmail,
        Password: data.password,
        Permanent: true,
      }),
    );

    try {
      await cognito.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: data.adminEmail,
          GroupName: "SUPER_ADMIN",
        }),
      );
    } catch (gErr) {
      console.warn(
        "Could not add user to group. Ensure group SUPER_ADMIN exists.",
        gErr.message,
      );
    }

    // Create Hospital in DynamoDB
    await put({
      PK: `HOSP#${hospitalId}`,
      SK: `METADATA`,
      entityType: "HOSPITAL",
      hospitalName: data.hospitalName,
      adminEmail: data.adminEmail,
      phone: data.phone,
      hospitalType: data.hospitalType,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create user record in DynamoDB
    await put({
      PK: `USER#${userId}`,
      SK: `METADATA`,
      "GSI1-PK": `HOSP#${hospitalId}`,
      "GSI1-SK": `USER#${userId}`,
      entityType: "USER",
      hospitalId: hospitalId,
      email: data.adminEmail,
      role: "SUPER_ADMIN",
      phone: data.phone,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
      updatedBy: userId,
    });

    logChange({
      entityId: hospitalId,
      entityType: "HOSPITAL",
      action: "CREATE",
      userId: userId,
      hospitalId: hospitalId,
      before: null,
      after: {
        hospitalName: data.hospitalName,
        hospitalType: data.hospitalType,
      },
    });

    try {
      await seedDefaultForms(hospitalId, userId);
    } catch (seedErr) {
      console.error("Failed to seed default forms", seedErr);
    }

    return { hospitalId, userId, message: "Hospital registered successfully" };
  } catch (err) {
    if (err.name === "UsernameExistsException") {
      throw new ConflictError("User with this email already exists");
    }
    throw err;
  }
};

export const login = async ({ email, password }) => {
  try {
    const authRes = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    const idToken = authRes.AuthenticationResult.IdToken;
    const decoded = jwt.decode(idToken);

    return {
      accessToken: authRes.AuthenticationResult.AccessToken,
      refreshToken: authRes.AuthenticationResult.RefreshToken,
      idToken: idToken,
      expiresIn: authRes.AuthenticationResult.ExpiresIn,
      userId: decoded.sub,
      hospitalId: decoded["custom:hospitalId"],
      role: decoded["custom:role"],
    };
  } catch (err) {
    throw new AuthError(err.message || "Invalid credentials");
  }
};

export const refresh = async ({ refreshToken }) => {
  try {
    const res = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }),
    );
    return { accessToken: res.AuthenticationResult.AccessToken };
  } catch (err) {
    throw new AuthError("Session expired or invalid refresh token");
  }
};

export const logout = async ({ accessToken }) => {
  try {
    await cognito.send(
      new GlobalSignOutCommand({
        AccessToken: accessToken,
      }),
    );
    return { message: "Successfully logged out" };
  } catch (err) {
    throw new AuthError(err.message);
  }
};

export const forgotPassword = async ({ email }) => {
  try {
    await cognito.send(
      new ForgotPasswordCommand({
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        Username: email,
      }),
    );
    return { message: "Password reset instructions sent" };
  } catch (err) {
    throw new AuthError(err.message);
  }
};

export const resetPassword = async ({
  email,
  confirmationCode,
  newPassword,
}) => {
  try {
    await cognito.send(
      new ConfirmForgotPasswordCommand({
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      }),
    );
    return { message: "Password has been successfully reset" };
  } catch (err) {
    throw new AuthError(err.message);
  }
};

export const changePassword = async ({
  accessToken,
  oldPassword,
  newPassword,
}) => {
  try {
    await cognito.send(
      new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword,
      }),
    );
    return { message: "Password changed successfully" };
  } catch (err) {
    throw new AuthError(err.message);
  }
};
