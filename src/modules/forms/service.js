import { v4 as uuidv4 } from "uuid";
import { get, put, query, update, transactWrite } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { getRognpatrakTemplate } from "./defaultTemplates.js";

// Fetch all forms natively mapping to their latest versions
export const listForms = async (caller, hospitalId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": "FORM#"
    }
  });

  const forms = result.Items.filter(f => f.status !== "ARCHIVED");
  
  const grouped = {};
  forms.forEach(f => {
    if (!grouped[f.formId] || grouped[f.formId].version < f.version) {
      grouped[f.formId] = f;
    }
  });

  return Object.values(grouped);
};

// Get a specific form (either latest PUBLISHED or specific version)
export const getForm = async (caller, hospitalId, formId, version) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  if (version) {
    const form = await get({ Key: { PK: `HOSP#${hospitalId}`, SK: `FORM#${formId}#V#${version}` } });
    if (!form || form.status === "ARCHIVED") throw new NotFoundError("Form not found");
    return form;
  }

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": `FORM#${formId}#V#`
    },
    ScanIndexForward: false
  });

  const activeVersions = result.Items.filter(f => f.status !== "ARCHIVED");
  if (activeVersions.length === 0) throw new NotFoundError("Form not found");

  const published = activeVersions.find(f => f.status === "PUBLISHED");
  return published || activeVersions[0];
};

export const createForm = async (caller, hospitalId, data) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const formId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const formItem = {
    PK: `HOSP#${hospitalId}`,
    SK: `FORM#${formId}#V#1`,
    entityType: "FORM_TEMPLATE",
    formId,
    hospitalId,
    formType: data.formType,
    version: 1,
    status: "DRAFT",
    name: data.name,
    nameMr: data.nameMr,
    sections: data.sections,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId
  };

  await put(formItem);
  
  logChange({
    entityId: formId,
    entityType: "FORM_TEMPLATE",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: null,
    after: formItem
  });

  return { formId, version: 1, message: "Form DRAFT created successfully" };
};

export const updateForm = async (caller, hospitalId, formId, data) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": `FORM#${formId}#V#`
    },
    ScanIndexForward: false
  });

  if (result.Items.length === 0) throw new NotFoundError("Form not found");
  
  const latest = result.Items[0];
  if (latest.status === "ARCHIVED") throw new ForbiddenError("Cannot modify archived form");

  const timestamp = new Date().toISOString();

  if (latest.status === "PUBLISHED") {
    const newVersion = latest.version + 1;
    const formItem = {
      ...latest,
      SK: `FORM#${formId}#V#${newVersion}`,
      version: newVersion,
      status: "DRAFT",
      name: data.name || latest.name,
      nameMr: data.nameMr || latest.nameMr,
      sections: data.sections || latest.sections,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: caller.userId,
      updatedBy: caller.userId
    };

    await put(formItem);

    logChange({
      entityId: formId,
      entityType: "FORM_TEMPLATE",
      action: "UPDATE_VERSION",
      userId: caller.userId,
      hospitalId: hospitalId,
      before: latest,
      after: formItem
    });

    return { formId, version: newVersion, message: `New draft version ${newVersion} created` };
  } else {
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    ["name", "nameMr", "sections"].forEach(field => {
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
    expressionAttributeValues[":updatedAt"] = timestamp;
    expressionAttributeValues[":updatedBy"] = caller.userId;

    const updatedAttrs = await update({
      Key: { PK: `HOSP#${hospitalId}`, SK: `FORM#${formId}#V#${latest.version}` },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    });

    logChange({
      entityId: formId,
      entityType: "FORM_TEMPLATE",
      action: "UPDATE",
      userId: caller.userId,
      hospitalId: hospitalId,
      before: latest,
      after: updatedAttrs
    });

    return updatedAttrs;
  }
};

export const publishForm = async (caller, hospitalId, formId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": `FORM#${formId}#V#`
    },
    ScanIndexForward: false
  });

  if (result.Items.length === 0) throw new NotFoundError("Form not found");

  const draft = result.Items.find(f => f.status === "DRAFT");
  if (!draft) throw new ConflictError("No draft version found to publish");

  const prevPublished = result.Items.find(f => f.status === "PUBLISHED");
  const timestamp = new Date().toISOString();

  const transactItems = [];

  transactItems.push({
    Update: {
      Key: { PK: `HOSP#${hospitalId}`, SK: `FORM#${formId}#V#${draft.version}` },
      UpdateExpression: "SET #status = :published, #updatedAt = :updatedAt, #updatedBy = :updatedBy",
      ExpressionAttributeNames: { "#status": "status", "#updatedAt": "updatedAt", "#updatedBy": "updatedBy" },
      ExpressionAttributeValues: { ":published": "PUBLISHED", ":updatedAt": timestamp, ":updatedBy": caller.userId }
    }
  });

  if (prevPublished) {
    transactItems.push({
      Update: {
        Key: { PK: `HOSP#${hospitalId}`, SK: `FORM#${formId}#V#${prevPublished.version}` },
        UpdateExpression: "SET #status = :archived, #updatedAt = :updatedAt, #updatedBy = :updatedBy",
        ExpressionAttributeNames: { "#status": "status", "#updatedAt": "updatedAt", "#updatedBy": "updatedBy" },
        ExpressionAttributeValues: { ":archived": "ARCHIVED", ":updatedAt": timestamp, ":updatedBy": caller.userId }
      }
    });
  }

  await transactWrite(transactItems);

  logChange({
    entityId: formId,
    entityType: "FORM_TEMPLATE",
    action: "PUBLISH",
    userId: caller.userId,
    hospitalId: hospitalId,
    before: draft,
    after: { ...draft, status: "PUBLISHED" }
  });

  return { message: "Form published successfully", version: draft.version };
};

export const deleteForm = async (caller, hospitalId, formId) => {
  if (caller.hospitalId !== hospitalId) throw new ForbiddenError("Access denied");

  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":skPrefix": `FORM#${formId}#V#`
    }
  });

  if (result.Items.length === 0) throw new NotFoundError("Form not found");

  const timestamp = new Date().toISOString();
  const transactItems = [];

  for (const item of result.Items) {
    if (item.status !== "ARCHIVED") {
      transactItems.push({
        Update: {
          Key: { PK: `HOSP#${hospitalId}`, SK: `FORM#${formId}#V#${item.version}` },
          UpdateExpression: "SET #status = :archived, #updatedAt = :updatedAt, #updatedBy = :updatedBy",
          ExpressionAttributeNames: { "#status": "status", "#updatedAt": "updatedAt", "#updatedBy": "updatedBy" },
          ExpressionAttributeValues: { ":archived": "ARCHIVED", ":updatedAt": timestamp, ":updatedBy": caller.userId }
        }
      });
    }
  }

  if (transactItems.length > 0) {
    await transactWrite(transactItems);
    
    logChange({
      entityId: formId,
      entityType: "FORM_TEMPLATE",
      action: "DELETE",
      userId: caller.userId,
      hospitalId: hospitalId,
      before: null,
      after: { status: "ARCHIVED", count: transactItems.length }
    });
  }

  return { message: "Form archived successfully" };
};

export const seedDefaultForms = async (hospitalId, userId) => {
  const rognPatrak = getRognpatrakTemplate();
  const formId = uuidv4();
  const timestamp = new Date().toISOString();

  const formItem = {
    PK: `HOSP#${hospitalId}`,
    SK: `FORM#${formId}#V#1`,
    entityType: "FORM_TEMPLATE",
    formId,
    hospitalId,
    formType: rognPatrak.formType,
    version: 1,
    status: "PUBLISHED", 
    name: rognPatrak.name,
    nameMr: rognPatrak.nameMr,
    sections: rognPatrak.sections,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: userId || "SYSTEM",
    updatedBy: userId || "SYSTEM"
  };

  await put(formItem);
  return formItem;
};
