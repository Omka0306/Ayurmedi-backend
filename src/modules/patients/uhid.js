import { update, get } from "../../common/db.js";
import { DatabaseError } from "../../common/errors.js";

export const generateUHID = async (hospitalId) => {
  const year = new Date().getFullYear();
  
  const hospital = await get({
    PK: `HOSP#${hospitalId}`,
    SK: "METADATA"
  });
  
  if (!hospital) {
    throw new DatabaseError("Hospital not found for UHID extraction");
  }
  
  const hospName = hospital.hospitalName || "HOS";
  const hospCode = hospName.replace(/[^A-Z]/gi, "").substring(0, 3).toUpperCase().padEnd(3, "X");
  
  const counterRecord = await update({
    PK: `COUNTER#HOSP#${hospitalId}`,
    SK: `YEAR#${year}`,
    UpdateExpression: "ADD seq :inc",
    ExpressionAttributeValues: {
      ":inc": 1
    },
    ReturnValues: "UPDATED_NEW"
  });
  
  const seqStr = String(counterRecord.seq).padStart(5, "0");
  return `${hospCode}-${year}-${seqStr}`;
};
