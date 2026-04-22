import { get, update } from "../../common/db.js";
import { NotFoundError, ForbiddenError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";

export const getHospital = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  
  const hospital = await get({ Key: { PK: `HOSP#${hospitalId}`, SK: "METADATA" } });
  if (!hospital || hospital.status === "INACTIVE") throw new NotFoundError("Hospital not found");
  
  return hospital;
};

export const updateHospital = async (caller, hospitalId, data) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");
  const existing = await getHospital(caller, hospitalId);

  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  const fields = ["name", "address", "gstin", "contactPhone", "contactEmail", "consultationFee", "settings"];
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
    Key: { PK: `HOSP#${hospitalId}`, SK: "METADATA" },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  });

  logChange({
    entityId: hospitalId,
    entityType: "HOSPITAL",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: existing,
    after: updatedAttrs
  });

  return updatedAttrs;
};
