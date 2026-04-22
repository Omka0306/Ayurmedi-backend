import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get, update, query } from "../../common/db.js";
import { generateFullHistoryPDF } from "./templates/fullHistory.js";
import { generateVisitSummaryPDF } from "./templates/visitSummary.js";
import { generatePkSummaryPDF } from "./templates/pkSummary.js";
import { generateDischargePDF } from "./templates/discharge.js";

const s3Client = new S3Client({});
const getBucket = () =>
  process.env.DOCUMENTS_BUCKET || "ayurmedi-documents-dev";

// SQS event handler
export const handler = async (event) => {
  for (const record of event.Records) {
    let messageBody;
    try {
      messageBody = JSON.parse(record.body);
    } catch (e) {
      // Log parse error without exposing raw body (may contain PII)
      console.error(
        JSON.stringify({
          error: "Invalid SQS message format",
          messageId: record.messageId,
        }),
      );
      continue;
    }

    const { jobId, hospitalId, callerUserId, reportType, params } = messageBody;

    // Status update: PROCESSING
    await updateJobStatus(jobId, "PROCESSING");

    try {
      let pdfBuffer;

      if (reportType === "FULL_HISTORY") {
        const { patientId } = params;
        const patient = await get({
          PK: `PATIENT#${patientId}`,
          SK: "PROFILE",
        });
        const consultations = await fetchPatientItems(patientId, "CONSULT#");
        const prescriptions = await fetchPatientItems(patientId, "RX#");
        const pkSessions = await fetchPatientItems(patientId, "PK#");
        const bills = await fetchPatientItems(patientId, "BILL#");
        pdfBuffer = await generateFullHistoryPDF(
          patient,
          consultations,
          prescriptions,
          pkSessions,
          bills,
        );
      } else if (reportType === "VISIT_SUMMARY") {
        const { patientId, consultId } = params;
        const patient = await get({
          PK: `PATIENT#${patientId}`,
          SK: "PROFILE",
        });
        const consultation = await get({
          PK: `PATIENT#${patientId}`,
          SK: `CONSULT#${consultId}`,
        });
        const prescriptions = await fetchPatientItems(
          patientId,
          `RX#${consultId}#`,
        );
        pdfBuffer = await generateVisitSummaryPDF(
          patient,
          consultation,
          prescriptions,
        );
      } else if (reportType === "PK_SUMMARY") {
        const { patientId, pkId } = params;
        const patient = await get({
          PK: `PATIENT#${patientId}`,
          SK: "PROFILE",
        });
        const plan = await get({
          PK: `PATIENT#${patientId}`,
          SK: `PK#${pkId}`,
        });
        const sessions = await fetchPatientItems(
          patientId,
          `PKSESSION#${pkId}#`,
        );
        pdfBuffer = await generatePkSummaryPDF(patient, plan, sessions);
      } else if (reportType === "DISCHARGE_SUMMARY") {
        const { patientId, dischargeNotes } = params;
        const patient = await get({
          PK: `PATIENT#${patientId}`,
          SK: "PROFILE",
        });
        const hospital = await get({
          PK: `HOSP#${hospitalId}`,
          SK: "METADATA",
        });
        pdfBuffer = await generateDischargePDF(
          patient,
          hospital,
          dischargeNotes,
        );
      } else {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Upload to S3 (private — no public ACL)
      const s3Key = `hospitals/${hospitalId}/reports/${reportType}/${jobId}.pdf`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: getBucket(),
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          // No ACL — relies on bucket-level private policy + presigned URL for access
        }),
      );

      // Generate Presigned URL (1h expiry) — only secure access mechanism
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: getBucket(), Key: s3Key }),
        { expiresIn: 3600 },
      );

      // Status update: COMPLETED
      await updateJobStatus(jobId, "COMPLETED", { s3Key, presignedUrl: url });
    } catch (error) {
      // Log full error details to CloudWatch without exposing patient PII
      // Use a safe stringify to handle circular references
      const safeStringify = (obj) => {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (cache.has(value)) return "[Circular]";
            cache.add(value);
          }
          return value;
        });
      };
      console.error(
        safeStringify({
          jobId,
          reportType,
          callerUserId,
          error: error.message,
          stack: error.stack,
        }),
      );
      await updateJobStatus(jobId, "FAILED", {
        errorMessage: "Report generation failed",
      });
      // Re-throw to return message to SQS for DLQ routing
      throw error;
    }
  }
};

const updateJobStatus = async (jobId, status, additionalFields = {}) => {
  let updateExp = "SET #st = :status, updatedAt = :ts";
  const names = { "#st": "status" };
  const vals = { ":status": status, ":ts": new Date().toISOString() };

  for (const [key, value] of Object.entries(additionalFields)) {
    updateExp += `, ${key} = :${key}`;
    vals[`:${key}`] = value;
  }

  await update({
    PK: `JOB#${jobId}`,
    SK: "METADATA",
    UpdateExpression: updateExp,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: vals,
  });
};

const fetchPatientItems = async (patientId, skPrefix) => {
  const result = await query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `PATIENT#${patientId}`,
      ":skPrefix": skPrefix,
    },
  });
  return result.Items || [];
};
