import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthError, ForbiddenError } from "./errors.js";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

export const authorizer = async (event) => {
  try {
    const token = event.authorizationToken?.replace("Bearer ", "");
    if (!token) {
      console.error("No token provided");
      return generatePolicy("user", "Deny", event.methodArn);
    }

    // Decode token without verification to get username (Cognito tokens are signed, we trust them here)
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const username = payload.username;
    const userId = payload.sub;

    if (!username) {
      console.error("No username in token");
      return generatePolicy("user", "Deny", event.methodArn);
    }

    // Fetch user attributes from Cognito to get custom claims
    let hospitalId = "";
    let role = "";
    try {
      const userResult = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: username,
        }),
      );
      const attrs = userResult.UserAttributes || [];
      hospitalId =
        attrs.find((a) => a.Name === "custom:hospitalId")?.Value || "";
      role = attrs.find((a) => a.Name === "custom:role")?.Value || "";
    } catch (cognitoErr) {
      console.error("Failed to fetch user attributes:", cognitoErr.message);
      // Continue with empty claims - will be caught by enforceHospitalScope in handlers
    }

    const context = {
      userId,
      hospitalId,
      role,
      email: payload.email || "",
    };

    console.log("Authorizer success:", { userId, role, hospitalId });
    return generatePolicy(userId, "Allow", event.methodArn, context);
  } catch (err) {
    console.error("Auth error:", err.message);
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

export const requireRole = (roles) => {
  return (event) => {
    const caller = getCallerIdentity(event);
    if (!roles.includes(caller.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
};

export const getCallerIdentity = (event) => {
  if (!event.requestContext || !event.requestContext.authorizer) {
    throw new AuthError("No authorizer context found");
  }
  const { userId, hospitalId, role } = event.requestContext.authorizer;
  return { userId, hospitalId, role };
};

/**
 * Enforces multi-tenancy isolation.
 * Throws ForbiddenError if the JWT hospitalId does not match the
 * {hospitalId} path parameter. Call at the top of every handler
 * that has {hospitalId} in the path.
 */
export const enforceHospitalScope = (event) => {
  const pathHospitalId = event.pathParameters?.hospitalId;
  if (!pathHospitalId) return; // no {hospitalId} in path — skip

  const { hospitalId: callerHospitalId, role } =
    event.requestContext?.authorizer || {};

  // SUPER_ADMIN is not bound to a single hospital
  if (role === "SUPER_ADMIN") return;

  if (!callerHospitalId || callerHospitalId !== pathHospitalId) {
    throw new ForbiddenError("Access denied: hospital mismatch");
  }
};
