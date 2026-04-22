import { v4 as uuidv4 } from "uuid";
import { get, put, update, query } from "../../common/db.js";
import { NotFoundError, ForbiddenError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";

export const listBranches = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": "BRANCH#"
    }
  });

  return result.Items;
};

export const getBranch = async (caller, hospitalId, branchId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  const branch = await get({ Key: { PK: `HOSP#${hospitalId}`, SK: `BRANCH#${branchId}` } });
  if (!branch) throw new NotFoundError("Branch not found");
  return branch;
};

export const createBranch = async (caller, hospitalId, data) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  
  const branchId = uuidv4();
  const timestamp = new Date().toISOString();

  const branchItem = {
    PK: `HOSP#${hospitalId}`,
    SK: `BRANCH#${branchId}`,
    entityType: "BRANCH",
    branchId,
    hospitalId,
    name: data.name,
    address: data.address,
    phone: data.phone,
    isMainBranch: data.isMainBranch,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(branchItem);

  logChange({
    entityId: branchId,
    entityType: "BRANCH",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: null,
    after: branchItem
  });

  return { branchId, message: "Branch created successfully" };
};

export const updateBranch = async (caller, hospitalId, branchId, data) => {
  const existing = await getBranch(caller, hospitalId, branchId);

  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  const fields = ["name", "address", "phone", "isMainBranch", "status"];
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
    Key: { PK: `HOSP#${hospitalId}`, SK: `BRANCH#${branchId}` },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  });

  logChange({
    entityId: branchId,
    entityType: "BRANCH",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: existing,
    after: updatedAttrs
  });

  return updatedAttrs;
};
