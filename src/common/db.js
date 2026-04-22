import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DatabaseError } from "./errors.js";

const clientConfig = {};
if (process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") {
  clientConfig.endpoint = "http://localhost:8000";
  clientConfig.region = "localhost";
  clientConfig.credentials = { accessKeyId: "DEFAULT_ACCESS_KEY", secretAccessKey: "DEFAULT_SECRET" };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const getTableName = () => process.env.TABLE_NAME || "AyurMediTable-dev";

const memDb = new Map();

export const get = async (params) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    // Services call get({PK, SK}) — the Key wrapping is only for raw SDK calls
    const pk = params.Key ? params.Key.PK : params.PK;
    const sk = params.Key ? params.Key.SK : params.SK;
    return memDb.get(`${pk}:::${sk}`) || undefined;
  }
  try {
    params.TableName = getTableName();
    const result = await docClient.send(new GetCommand(params));
    return result.Item;
  } catch (err) {
    throw new DatabaseError(`Get Error: ${err.message}`);
  }
};

export const put = async (item, options = {}) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    memDb.set(`${item.PK}:::${item.SK}`, { ...item });
    return item;
  }
  try {
    const params = {
      TableName: getTableName(),
      Item: item,
      ...options
    };
    await docClient.send(new PutCommand(params));
    return item;
  } catch (err) {
    throw new DatabaseError(`Put Error: ${err.message}`);
  }
};

// Helper: apply a DynamoDB UpdateExpression to an in-memory item (for test mode)
const applyUpdateExpression = (item, params) => {
  const expr = params.UpdateExpression || "";
  const attrVals = params.ExpressionAttributeValues || {};
  const attrNames = params.ExpressionAttributeNames || {};

  const resolveFieldName = (raw) =>
    raw.startsWith('#') && attrNames[raw] ? attrNames[raw] : raw;

  // Handle combined ADD ... SET ... or SET ... ADD ...
  // Split on ADD/SET keyword boundaries
  const addMatch = expr.match(/ADD\s+([^S][^E][^T][^\s=,].*?)(?=\s+SET|$)/i);
  const setMatch = expr.match(/SET\s+(.+?)(?=\s+ADD|$)/is);

  if (addMatch || expr.trimStart().startsWith('ADD')) {
    // Find ADD clause
    const addIdx = expr.indexOf('ADD ');
    let addClause = expr.slice(addIdx + 4);
    const setIdx = addClause.indexOf(' SET ');
    if (setIdx !== -1) addClause = addClause.slice(0, setIdx);
    const parts = addClause.trim().split(/\s+/);
    for (let i = 0; i < parts.length - 1; i += 2) {
      const fieldName = resolveFieldName(parts[i]);
      const val = attrVals[parts[i + 1]] || 0;
      if (item[fieldName] === undefined) item[fieldName] = 0;
      item[fieldName] += val;
    }
  }

  if (setMatch || expr.trimStart().startsWith('SET')) {
    const setIdx = expr.indexOf('SET ');
    let setClauses = expr.slice(setIdx + 4);
    const addIdx = setClauses.indexOf(' ADD ');
    if (addIdx !== -1) setClauses = setClauses.slice(0, addIdx);
    const clauses = setClauses.split(',');
    for (const clause of clauses) {
      const eqIdx = clause.indexOf('=');
      if (eqIdx === -1) continue;
      const rawField = clause.slice(0, eqIdx).trim();
      const rawVal = clause.slice(eqIdx + 1).trim();
      const fieldName = resolveFieldName(rawField);
      // Check if arithmetic: field = field - :val or field = field + :val
      const subMatch = rawVal.match(/^(\w+)\s*-\s*(:?\w+)$/);
      const addExpr = rawVal.match(/^(\w+)\s*\+\s*(:?\w+)$/);
      if (subMatch) {
        const sourceField = resolveFieldName(subMatch[1]);
        const operandKey = subMatch[2];
        const operand = operandKey.startsWith(':') ? (attrVals[operandKey] || 0) : (item[operandKey] || 0);
        item[fieldName] = (item[sourceField] || 0) - operand;
      } else if (addExpr) {
        const sourceField = resolveFieldName(addExpr[1]);
        const operandKey = addExpr[2];
        const operand = operandKey.startsWith(':') ? (attrVals[operandKey] || 0) : (item[operandKey] || 0);
        item[fieldName] = (item[sourceField] || 0) + operand;
      } else {
        // Simple assignment
        item[fieldName] = attrVals[rawVal] !== undefined ? attrVals[rawVal] : item[rawVal];
      }
    }
  }

  return item;
};

export const update = async (params) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    const rawKey = params.Key || { PK: params.PK, SK: params.SK };
    const key = `${rawKey.PK}:::${rawKey.SK}`;
    let item = memDb.get(key) || { PK: rawKey.PK, SK: rawKey.SK };
    item = applyUpdateExpression(item, params);
    memDb.set(key, item);
    return item;
  }
  try {
    params.TableName = getTableName();
    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (err) {
    throw new DatabaseError(`Update Error: ${err.message}`);
  }
};

export const deleteItem = async (params) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    const rawKey = params.Key || { PK: params.PK, SK: params.SK };
    memDb.delete(`${rawKey.PK}:::${rawKey.SK}`);
    return true;
  }
  try {
    params.TableName = getTableName();
    await docClient.send(new DeleteCommand(params));
    return true;
  } catch (err) {
    throw new DatabaseError(`Delete Error: ${err.message}`);
  }
};

export const query = async (params) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    // If not a GSI query, match PK and SK condition
    if (!params.IndexName) {
      const pkObj = params.ExpressionAttributeValues[':pk'];
      const pkVal = pkObj || null;
      let skPrefix = params.ExpressionAttributeValues[':skPrefix'] || null;
      
      let items = Array.from(memDb.values()).filter(i => {
        let match = true;
        if (pkVal) match = match && (i.PK === pkVal);
        if (skPrefix) match = match && (i.SK && i.SK.startsWith(skPrefix));
        return match;
      });
      
      // Sort by SK
      items.sort((a, b) => {
        if (a.SK < b.SK) return -1;
        if (a.SK > b.SK) return 1;
        return 0;
      });
      
      if (params.ScanIndexForward === false) {
        items.reverse();
      }
      
      return { Items: items, LastEvaluatedKey: null };
    }
  
    // Fallback for GSI queries or basic search
    let conditionVals = Object.values(params.ExpressionAttributeValues || {});
    if (conditionVals.length === 0) return { Items: [] };
    const matchVal = conditionVals[0];
    const items = Array.from(memDb.values()).filter(i => {
      return Object.values(i).includes(matchVal) || JSON.stringify(i).includes(matchVal);
    });
    return { Items: items, LastEvaluatedKey: null };
  }
  try {
    params.TableName = getTableName();
    const result = await docClient.send(new QueryCommand(params));
    return {
      Items: result.Items,
      LastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (err) {
    throw new DatabaseError(`Query Error: ${err.message}`);
  }
};

export const scan = async (params = {}) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    let items = Array.from(memDb.values());
    if (params.ExpressionAttributeValues) {
      const filterVals = Object.values(params.ExpressionAttributeValues);
      items = items.filter(i => filterVals.every(v => Object.values(i).includes(v)));
    }
    return { Items: items, LastEvaluatedKey: null };
  }
  try {
    params.TableName = getTableName();
    const result = await docClient.send(new ScanCommand(params));
    return {
      Items: result.Items,
      LastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (err) {
    throw new DatabaseError(`Scan Error: ${err.message}`);
  }
};

export const transactWrite = async (params) => {
  if ((process.env.NODE_ENV === "test" || process.env.IS_OFFLINE === "true") && process.env.TEST_DB_SDK !== "true") {
    // Services may call transactWrite(arrayOfItems) or transactWrite({TransactItems:[...]})
    const items = Array.isArray(params) ? params : (params.TransactItems || []);
    for (const req of items) {
      if (req.Put) await put(req.Put.Item);
      if (req.Update) {
        const rawKey = req.Update.Key;
        const key = `${rawKey.PK}:::${rawKey.SK}`;
        let item = memDb.get(key) || { PK: rawKey.PK, SK: rawKey.SK };
        item = applyUpdateExpression(item, req.Update);
        memDb.set(key, item);
      }
    }
    return true;
  }
  try {
    const transactItems = Array.isArray(params) ? params : (params.TransactItems || []);
    for (const item of transactItems) {
      const type = Object.keys(item)[0];
      if (!item[type].TableName) {
        item[type].TableName = getTableName();
      }
    }
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return true;
  } catch (err) {
    throw new DatabaseError(`TransactWrite Error: ${err.message}`);
  }
};
