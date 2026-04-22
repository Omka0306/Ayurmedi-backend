import { put } from "./db.js";

// Fire-and-forget audit logger
export const logChange = ({ entityId, entityType, action, userId, hospitalId, before, after }) => {
  const timestamp = new Date().toISOString();
  
  const auditItem = {
    PK: `AUDIT#${entityId}`,
    SK: `LOG#${timestamp}#${userId}`,
    entityId,
    entityType,
    action, // "CREATE" | "UPDATE" | "DELETE" | "VIEW"
    userId,
    hospitalId,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    createdAt: timestamp,
  };

  put(auditItem).catch(err => {
    console.error("Failed to write audit log:", err);
  });
};
