import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDisableUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { get, put, update, query } from "../../common/db.js";
import { logChange } from "../../common/auditLogger.js";
import { ConflictError, NotFoundError, ForbiddenError } from "../../common/errors.js";

const cognito = new CognitoIdentityProviderClient({});

export const listUsers = async (caller, queryParams) => {
  const { hospitalId } = caller;
  const limit = queryParams.limit || 20;
  const lastKey = queryParams.lastKey ? JSON.parse(Buffer.from(queryParams.lastKey, 'base64').toString('utf-8')) : undefined;

  const result = await query({
    IndexName: "GSI1",
    KeyConditionExpression: "#gsi1pk = :hospId AND begins_with(#gsi1sk, :userPrefix)",
    ExpressionAttributeNames: {
      "#gsi1pk": "GSI1-PK",
      "#gsi1sk": "GSI1-SK"
    },
    ExpressionAttributeValues: {
      ":hospId": `HOSP#${hospitalId}`,
      ":userPrefix": "USER#"
    },
    Limit: limit,
    ExclusiveStartKey: lastKey
  });

  const nextKey = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;

  return {
    items: result.Items,
    lastKey: nextKey
  };
};

export const getUser = async (caller, userId) => {
  const user = await get({ Key: { PK: `USER#${userId}`, SK: "METADATA" } });
  if (!user) throw new NotFoundError("User not found");
  if (user.hospitalId !== caller.hospitalId) throw new ForbiddenError("Access denied");
  return user;
};

export const createUser = async (caller, data) => {
  const { hospitalId } = caller;
  const timestamp = new Date().toISOString();

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  let userResponse;
  try {
    userResponse = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: data.email,
      UserAttributes: [
        { Name: "email", Value: data.email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:hospitalId", Value: hospitalId },
        { Name: "custom:role", Value: data.role },
        ...(data.branchId ? [{ Name: "custom:branchId", Value: data.branchId }] : [])
      ],
      MessageAction: "SUPPRESS"
    }));
  } catch (err) {
    if (err.name === "UsernameExistsException") {
      throw new ConflictError("User with this email already exists");
    }
    throw err;
  }

  const subAttr = userResponse.User.Attributes.find(a => a.Name === "sub");
  const userId = subAttr ? subAttr.Value : userResponse.User.Username;

  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: data.email,
    Password: data.password,
    Permanent: true
  }));

  try {
    await cognito.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: data.email,
      GroupName: data.role
    }));
  } catch (gErr) {
    console.warn(`Could not add user to group ${data.role}`, gErr.message);
  }

  const userItem = {
    PK: `USER#${userId}`,
    SK: `METADATA`,
    "GSI1-PK": `HOSP#${hospitalId}`,
    "GSI1-SK": `USER#${userId}`,
    entityType: "USER",
    hospitalId: hospitalId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
    phone: data.phone,
    branchId: data.branchId || null,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(userItem);

  logChange({
    entityId: userId,
    entityType: "USER",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: null,
    after: userItem
  });

  return { userId, message: "User created successfully" };
};

export const updateUser = async (caller, userId, data) => {
  const existing = await getUser(caller, userId);

  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  const fields = ["firstName", "lastName", "phone", "role", "branchId", "status"];
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = data[field];
    }
  });

  if (updateExpressions.length === 0) return { message: "No updates provided" };

  updateExpressions.push("#updatedAt = :updatedAt", "#updatedBy = :updatedBy");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeNames["#updatedBy"] = "updatedBy";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();
  expressionAttributeValues[":updatedBy"] = caller.userId;

  const updatedAttrs = await update({
    Key: { PK: `USER#${userId}`, SK: "METADATA" },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  });

  logChange({
    entityId: userId,
    entityType: "USER",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: caller.hospitalId,
    before: existing,
    after: updatedAttrs
  });

  return updatedAttrs;
};

export const deleteUser = async (caller, userId) => {
  const existing = await getUser(caller, userId);

  await update({
    Key: { PK: `USER#${userId}`, SK: "METADATA" },
    UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt, #updatedBy = :updatedBy",
    ExpressionAttributeNames: {
      "#status": "status",
      "#updatedAt": "updatedAt",
      "#updatedBy": "updatedBy"
    },
    ExpressionAttributeValues: {
      ":status": "INACTIVE",
      ":updatedAt": new Date().toISOString(),
      ":updatedBy": caller.userId
    }
  });

  try {
    await cognito.send(new AdminDisableUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: existing.email
    }));
  } catch (err) {
    console.error("Failed to disable user in Cognito during delete", err);
  }

  logChange({
    entityId: userId,
    entityType: "USER",
    action: "DELETE",
    userId: caller.userId,
    hospitalId: caller.hospitalId,
    before: existing,
    after: { ...existing, status: "INACTIVE" }
  });

  return { message: "User disabled successfully" };
};
