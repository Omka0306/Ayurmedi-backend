import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get, put, update, query, transactWrite } from "../../common/db.js";
import {
  AuthError,
  NotFoundError,
  ConflictError,
} from "../../common/errors.js";
import { logChange } from "../../common/auditLogger.js";
import { generatePDFBuffer } from "./pdfTemplate.js";

const s3Client = new S3Client({});
const getBucketName = () =>
  process.env.DOCUMENTS_BUCKET || "ayurmedi-documents-dev";

// Helper: convert frequency to daily multiplier
const getFrequencyMultiplier = (frequency) => {
  const map = {
    ONCE_DAILY: 1,
    TWICE_DAILY: 2,
    THRICE_DAILY: 3,
    FOUR_TIMES_DAILY: 4,
    EVERY_4_HOURS: 6,
    EVERY_6_HOURS: 4,
    EVERY_8_HOURS: 3,
    EVERY_12_HOURS: 2,
    AS_NEEDED: 1,
    SOS: 1,
  };
  return map[frequency] || 1;
};

export const createPrescription = async (caller, consultId, data) => {
  if (caller.hospitalId !== data.hospitalId) {
    throw new AuthError("Access denied to this hospital");
  }

  const rxId = uuidv4();
  const timestamp = new Date().toISOString();

  const rxItem = {
    PK: `CONSULT#${consultId}`,
    SK: `RX#${rxId}`,
    entityType: "PRESCRIPTION",
    rxId,
    consultId,
    patientId: data.patientId,
    doctorId: data.doctorId,
    hospitalId: data.hospitalId,
    medicines: data.medicines || [],
    treatments: data.treatments || [],
    dietInstructions: data.dietInstructions || { pathya: [], apathya: [] },
    lifestyleInstructions: data.lifestyleInstructions || {},
    precautions: data.precautions || "",
    followUpDate: data.followUpDate,
    treatmentDurationDays: data.treatmentDurationDays,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: caller.userId,
    updatedBy: caller.userId,
  };

  const transactItems = [];
  // Prescription creation
  transactItems.push({
    Put: {
      Item: rxItem,
    },
  });

  // Calculate inventory deductions grouped by itemId
  const deductionMap = {};
  if (data.medicines) {
    for (const med of data.medicines) {
      if (med.inventoryItemId) {
        if (!deductionMap[med.inventoryItemId])
          deductionMap[med.inventoryItemId] = 0;
        // Calculate total quantity: dosageQty * frequency * durationDays
        const frequencyMultiplier = getFrequencyMultiplier(med.frequency);
        const duration = med.durationDays || 1;
        const totalQty = (med.dosageQty || 1) * frequencyMultiplier * duration;
        deductionMap[med.inventoryItemId] += totalQty;
      }
    }
  }

  const inventoryItemIds = Object.keys(deductionMap);

  if (inventoryItemIds.length > 0) {
    for (const itemId of inventoryItemIds) {
      const qty = deductionMap[itemId];
      transactItems.push({
        Update: {
          Key: { PK: `HOSP#${data.hospitalId}`, SK: `INV#${itemId}` },
          UpdateExpression:
            "SET currentStock = currentStock - :qty, updatedAt = :ts",
          ConditionExpression: "currentStock >= :qty",
          ExpressionAttributeValues: { ":qty": qty, ":ts": timestamp },
        },
      });
      transactItems.push({
        Put: {
          Item: {
            PK: `INV#${itemId}`,
            SK: `TXN#${uuidv4()}`,
            entityType: "STOCK_TRANSACTION",
            txnId: uuidv4(),
            itemId,
            hospitalId: data.hospitalId,
            type: "STOCK_OUT",
            quantity: qty,
            reason: `Prescription ${rxId}`,
            referenceId: rxId,
            performedBy: caller.userId,
            performedAt: timestamp,
          },
        },
      });
    }
  }

  if (transactItems.length > 100) {
    throw new ConflictError("Too many distinct elements structurally bounded");
  }

  try {
    await transactWrite({ TransactItems: transactItems });
  } catch (err) {
    if (
      err.message.includes("ConditionalCheckFailed") ||
      err.message.includes("TransactionCanceled")
    ) {
      for (const itemId of inventoryItemIds) {
        const itemRecord = await get({
          PK: `HOSP#${data.hospitalId}#INV`,
          SK: `ITEM#${itemId}`,
        });
        if (!itemRecord || itemRecord.currentStock < deductionMap[itemId]) {
          throw new ConflictError(
            `Insufficient stock for ${itemRecord?.itemName || itemId}. Available: ${itemRecord?.currentStock || 0}, Requested: ${deductionMap[itemId]}`,
          );
        }
      }
    }
    throw err;
  }

  await logChange({
    entityId: rxId,
    entityType: "PRESCRIPTION",
    action: "CREATE",
    userId: caller.userId,
    hospitalId: data.hospitalId,
    before: null,
    after: rxItem,
  });

  return rxItem;
};

export const getPrescriptions = async (caller, consultId) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `CONSULT#${consultId}`,
      ":skPrefix": "RX#",
    },
  });

  const data = result.Items || [];
  data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return data.filter((r) => r.hospitalId === caller.hospitalId);
};

export const updatePrescription = async (caller, consultId, rxId, data) => {
  const existing = await get({
    PK: `CONSULT#${consultId}`,
    SK: `RX#${rxId}`,
  });

  if (!existing) throw new NotFoundError("Prescription not found");
  if (existing.hospitalId !== caller.hospitalId)
    throw new AuthError("Access denied");

  const timestamp = new Date().toISOString();

  let updateExp = "SET updatedAt = :ts, updatedBy = :ub";
  const expValues = {
    ":ts": timestamp,
    ":ub": caller.userId,
  };

  const fields = [
    "medicines",
    "treatments",
    "dietInstructions",
    "lifestyleInstructions",
    "precautions",
    "followUpDate",
    "treatmentDurationDays",
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updateExp += `, ${field} = :${field}`;
      expValues[`:${field}`] = data[field];
    }
  }

  const updatedRx = await update({
    PK: `CONSULT#${consultId}`,
    SK: `RX#${rxId}`,
    UpdateExpression: updateExp,
    ExpressionAttributeValues: expValues,
    ReturnValues: "ALL_NEW",
  });

  await logChange({
    entityId: rxId,
    entityType: "PRESCRIPTION",
    action: "UPDATE",
    userId: caller.userId,
    hospitalId: existing.hospitalId,
    before: existing,
    after: updatedRx,
  });

  return updatedRx;
};

export const getPrescriptionPdf = async (caller, consultId, rxId) => {
  const existing = await get({
    PK: `CONSULT#${consultId}`,
    SK: `RX#${rxId}`,
  });

  if (!existing) throw new NotFoundError("Prescription not found");
  if (existing.hospitalId !== caller.hospitalId)
    throw new AuthError("Access denied");

  const s3Key = `hospitals/${existing.hospitalId}/prescriptions/${rxId}.pdf`;
  const generateNew =
    !existing.pdfS3Key ||
    !existing.pdfGeneratedAt ||
    new Date(existing.updatedAt) > new Date(existing.pdfGeneratedAt);

  if (generateNew) {
    const hospital = await get({
      PK: `HOSP#${existing.hospitalId}`,
      SK: "METADATA",
    });
    const pdfBuffer = await generatePDFBuffer(existing, hospital || {});

    await s3Client.send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      }),
    );

    const timestamp = new Date().toISOString();
    await update({
      PK: `CONSULT#${consultId}`,
      SK: `RX#${rxId}`,
      UpdateExpression: "SET pdfS3Key = :k, pdfGeneratedAt = :ts",
      ExpressionAttributeValues: {
        ":k": s3Key,
        ":ts": timestamp,
      },
    });
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return { url, generated: generateNew, s3Key };
};
