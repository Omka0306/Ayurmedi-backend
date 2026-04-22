#!/usr/bin/env node
/**
 * AyurMedi Seed Script — Phase 17
 * Usage: node scripts/seed.js --stage dev
 *
 * Calls AWS Cognito + DynamoDB directly (same as service layer).
 * Requires: AWS credentials configured, SSM params set for the stage.
 */

import { parseArgs } from "node:util";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { v4 as uuidv4 } from "uuid";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ── Parse CLI args ────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: { stage: { type: "string", default: "dev" } },
});
const STAGE = args.stage;
const REGION = "ap-south-1";

console.log(`\n🌱  AyurMedi Seed — stage: ${STAGE}\n`);

// ── AWS Clients ───────────────────────────────────────────────────────────────
// Use explicit credentials from ~/.aws/credentials file
let credentials;
try {
  const credsPath = join(homedir(), ".aws", "credentials");
  const credsContent = readFileSync(credsPath, "utf-8");
  const lines = credsContent.split("\n");
  let inDefault = false;
  let accessKeyId, secretAccessKey;
  for (const line of lines) {
    if (line.trim() === "[default]") {
      inDefault = true;
    } else if (line.startsWith("[") && line.endsWith("]")) {
      inDefault = false;
    } else if (inDefault) {
      const [key, value] = line.split("=").map((s) => s.trim());
      if (key === "aws_access_key_id") accessKeyId = value;
      if (key === "aws_secret_access_key") secretAccessKey = value;
    }
  }
  if (accessKeyId && secretAccessKey) {
    credentials = { accessKeyId, secretAccessKey };
    console.log("✅  AWS credentials loaded from ~/.aws/credentials");
  }
} catch (e) {
  console.log(
    "⚠️  Could not load AWS credentials from file, using env vars or default chain",
  );
}

const awsConfig = credentials
  ? { region: REGION, credentials }
  : { region: REGION };

const ssm = new SSMClient(awsConfig);
const cognito = new CognitoIdentityProviderClient(awsConfig);

let MOCK_MODE = false;

async function getParam(name) {
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: `/ayurmedi/${STAGE}/${name}` }),
    );
    return res.Parameter.Value;
  } catch (err) {
    console.log(`    ⚠️  SSM Error for ${name}: ${err.message}`);
    MOCK_MODE = true;
    return `mock-${name}`;
  }
}

let TABLE_NAME, USER_POOL_ID, APP_CLIENT_ID;

async function initConfig() {
  TABLE_NAME = await getParam("TABLE_NAME");
  USER_POOL_ID = await getParam("COGNITO_USER_POOL_ID");
  APP_CLIENT_ID = await getParam("COGNITO_APP_CLIENT_ID");

  if (MOCK_MODE) {
    console.log(
      `⚠️  AWS Info not found (stack not deployed?). Using MOCK_MODE.`,
    );
  } else {
    console.log(`✅  Config loaded — Table: ${TABLE_NAME}`);
  }
}

const getDocClient = () =>
  MOCK_MODE
    ? null
    : DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

let docClient;
const db = {
  put: async (item) => {
    if (MOCK_MODE) return item;
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  },
  get: async (pk, sk) => {
    if (MOCK_MODE) return { status: "PUBLISHED", formId: uuidv4(), version: 1 };
    const res = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } }),
    );
    return res.Item;
  },
  query: async (params) => {
    if (MOCK_MODE) return [];
    const res = await docClient.send(
      new QueryCommand({ TableName: TABLE_NAME, ...params }),
    );
    return res.Items || [];
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ts = () => new Date().toISOString();
const log = (msg) => process.stdout.write(`  ${msg}\n`);
const ok = (msg) => process.stdout.write(`  ✅  ${msg}\n`);
const skip = (msg) => process.stdout.write(`  ⏭   ${msg}\n`);

async function login(email, password) {
  if (MOCK_MODE) return "mock-jwt-token-ey...";
  const res = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: APP_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  return res.AuthenticationResult.AccessToken;
}

// ── 1. Hospital + Super Admin ─────────────────────────────────────────────────
async function seedHospital() {
  log("Creating hospital + super admin...");

  const hospitalId = uuidv4();
  const adminEmail = "admin@mitramayurveda.com";
  const adminPassword = "Admin@1234!";

  // Create Cognito user (delete first if exists from previous seed)
  try {
    if (!MOCK_MODE) {
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: adminEmail,
        }),
      );
      log("Removed existing Cognito user");
    }
  } catch (_) {
    /* not found — ok */
  }

  let userId = uuidv4();
  if (!MOCK_MODE) {
    const userRes = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: adminEmail,
        UserAttributes: [
          { Name: "email", Value: adminEmail },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:hospitalId", Value: hospitalId },
          { Name: "custom:role", Value: "SUPER_ADMIN" },
        ],
        MessageAction: "SUPPRESS",
      }),
    );

    userId =
      userRes.User.Attributes.find((a) => a.Name === "sub")?.Value ||
      userRes.User.Username;

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: adminEmail,
        Password: adminPassword,
        Permanent: true,
      }),
    );
  }

  // DynamoDB hospital record
  await db.put({
    PK: `HOSP#${hospitalId}`,
    SK: "METADATA",
    entityType: "HOSPITAL",
    hospitalId,
    hospitalName: "Mitram Ayurveda",
    hospitalType: "AYURVEDIC",
    address: "123 Ayurveda Marg, Pune 411001",
    gstin: "27AAAAA0000A1Z5",
    contactPhone: "02012345678",
    contactEmail: adminEmail,
    consultationFee: 500,
    adminEmail,
    status: "ACTIVE",
    createdAt: ts(),
    updatedAt: ts(),
    createdBy: userId,
    updatedBy: userId,
    "GSI1-PK": "ALL_HOSPITALS",
    "GSI1-SK": `HOSP#${hospitalId}`,
    hospitalId,
    createdAt: ts(),
  });

  // DynamoDB user record
  await db.put({
    PK: `USER#${userId}`,
    SK: "METADATA",
    "GSI1-PK": `HOSP#${hospitalId}`,
    "GSI1-SK": `USER#${userId}`,
    entityType: "USER",
    userId,
    hospitalId,
    email: adminEmail,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: ts(),
    updatedAt: ts(),
    createdBy: userId,
    updatedBy: userId,
  });

  ok(`Hospital created: ${hospitalId}`);
  ok(`Super admin: ${adminEmail} / ${adminPassword}`);

  // Get access token
  const accessToken = await login(adminEmail, adminPassword);
  ok("Logged in — accessToken obtained");

  return { hospitalId, userId, accessToken, adminEmail };
}

// ── 2. Branches ───────────────────────────────────────────────────────────────
async function seedBranches(hospitalId, userId) {
  log("Creating branches...");

  const mainBranchId = uuidv4();
  const nashikBranchId = uuidv4();

  const branches = [
    {
      branchId: mainBranchId,
      name: "Main Branch",
      address: {
        line1: "123 Ayurveda Marg",
        city: "Pune",
        state: "Maharashtra",
        zip: "411001",
      },
      phone: "02012345678",
      isMainBranch: true,
    },
    {
      branchId: nashikBranchId,
      name: "Nashik Branch",
      address: {
        line1: "45 Trimbak Road",
        city: "Nashik",
        state: "Maharashtra",
        zip: "422001",
      },
      phone: "02532345678",
      isMainBranch: false,
    },
  ];

  for (const b of branches) {
    await db.put({
      PK: `HOSP#${hospitalId}`,
      SK: `BRANCH#${b.branchId}`,
      entityType: "BRANCH",
      ...b,
      hospitalId,
      status: "ACTIVE",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });
    ok(`Branch: ${b.name} (${b.branchId})`);
  }

  return { mainBranchId, nashikBranchId };
}

// ── 3. Doctors ────────────────────────────────────────────────────────────────
async function seedDoctors(hospitalId, mainBranchId, userId) {
  log("Creating doctors...");

  const doctorDefs = [
    {
      name: "Vaidya Shashikant Kumar",
      specialization: "Panchakarma",
      registrationNumber: "MAH-AY-001",
    },
    {
      name: "Vaidya Mangesh Thamke",
      specialization: "Kayachikitsa",
      registrationNumber: "MAH-AY-002",
    },
    {
      name: "Vaidya Pravin Mane",
      specialization: "Shalya Tantra",
      registrationNumber: "MAH-AY-003",
    },
  ];

  const doctorIds = [];

  for (const d of doctorDefs) {
    const doctorId = uuidv4();
    const doctorUserId = uuidv4();

    await db.put({
      PK: `HOSP#${hospitalId}`,
      SK: `DOCTOR#${doctorId}`,
      "GSI1-PK": `HOSP#${hospitalId}`,
      "GSI1-SK": `DOCTOR#${doctorId}`,
      entityType: "DOCTOR",
      doctorId,
      hospitalId,
      userId: doctorUserId,
      branchIds: [mainBranchId],
      name: d.name,
      specialization: d.specialization,
      registrationNumber: d.registrationNumber,
      availabilityStatus: "AVAILABLE",
      averageConsultationMinutes: 15,
      status: "ACTIVE",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });

    doctorIds.push(doctorId);
    ok(`Doctor: ${d.name} (${doctorId})`);
  }

  return doctorIds;
}

// ── 4. Form Template ──────────────────────────────────────────────────────────
async function seedFormTemplate(hospitalId, userId) {
  log("Checking/seeding Rognpatrak form template...");

  // Check if any form exists already (seeded by register-hospital logic)
  const existingForms = await db.query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `HOSP#${hospitalId}`,
      ":prefix": "FORM#",
    },
  });

  if (existingForms.length > 0) {
    const published = existingForms.find((f) => f.status === "PUBLISHED");
    if (published) {
      skip(
        `Form template already exists: ${published.formId} v${published.version}`,
      );
      return { formId: published.formId, formVersion: published.version };
    }
  }

  // Create Rognpatrak form template manually
  const formId = uuidv4();
  const version = 1;

  // Required fields with UUIDs
  const f = {
    patientNameId: uuidv4(),
    ageId: uuidv4(),
    genderId: uuidv4(),
    addressId: uuidv4(),
    chiefComplaintId: uuidv4(),
    durationId: uuidv4(),
    pastHistoryId: uuidv4(),
    familyHistoryId: uuidv4(),
    prakrutiId: uuidv4(),
    occupationId: uuidv4(),
  };

  const formItem = {
    PK: `HOSP#${hospitalId}`,
    SK: `FORM#${formId}#V${version}`,
    entityType: "FORM",
    formId,
    hospitalId,
    formType: "PATIENT_REGISTRATION",
    name: "Rognpatrak",
    nameMr: "रोगपत्रक",
    version,
    status: "PUBLISHED",
    publishedAt: ts(),
    sections: [
      {
        sectionId: uuidv4(),
        title: "Personal Details",
        titleMr: "वैयक्तिक माहिती",
        order: 1,
        fields: [
          {
            fieldId: f.patientNameId,
            name: "patientName",
            label: "Patient Name",
            labelMr: "रुग्णाचे नाव",
            type: "TEXT",
            required: true,
            order: 1,
          },
          {
            fieldId: f.ageId,
            name: "age",
            label: "Age",
            labelMr: "वय",
            type: "NUMBER",
            required: true,
            order: 2,
          },
          {
            fieldId: f.genderId,
            name: "gender",
            label: "Gender",
            labelMr: "लिंग",
            type: "DROPDOWN",
            required: true,
            order: 3,
            options: [
              { value: "MALE", label: "Male", labelMr: "पुरुष" },
              { value: "FEMALE", label: "Female", labelMr: "स्त्री" },
              { value: "OTHER", label: "Other", labelMr: "इतर" },
            ],
          },
          {
            fieldId: f.addressId,
            name: "address",
            label: "Address",
            labelMr: "पत्ता",
            type: "TEXTAREA",
            required: false,
            order: 4,
          },
          {
            fieldId: f.occupationId,
            name: "occupation",
            label: "Occupation",
            labelMr: "व्यवसाय",
            type: "TEXT",
            required: false,
            order: 5,
          },
        ],
      },
      {
        sectionId: uuidv4(),
        title: "Chief Complaints",
        titleMr: "मुख्य तक्रारी",
        order: 2,
        fields: [
          {
            fieldId: f.chiefComplaintId,
            name: "chiefComplaint",
            label: "Chief Complaint",
            labelMr: "मुख्य तक्रार",
            type: "TEXTAREA",
            required: true,
            order: 1,
          },
          {
            fieldId: f.durationId,
            name: "duration",
            label: "Duration",
            labelMr: "कालावधी",
            type: "TEXT",
            required: true,
            order: 2,
          },
        ],
      },
      {
        sectionId: uuidv4(),
        title: "Medical History",
        titleMr: "वैद्यकीय इतिहास",
        order: 3,
        fields: [
          {
            fieldId: f.pastHistoryId,
            name: "pastHistory",
            label: "Past Medical History",
            labelMr: "भूतकाळातील आजार",
            type: "TEXTAREA",
            required: false,
            order: 1,
          },
          {
            fieldId: f.familyHistoryId,
            name: "familyHistory",
            label: "Family History",
            labelMr: "कौटुंबिक इतिहास",
            type: "TEXTAREA",
            required: false,
            order: 2,
          },
          {
            fieldId: f.prakrutiId,
            name: "prakruti",
            label: "Prakruti",
            labelMr: "प्रकृती",
            type: "DROPDOWN",
            required: false,
            order: 3,
            options: [
              { value: "VATA", label: "Vata", labelMr: "वात" },
              { value: "PITTA", label: "Pitta", labelMr: "पित्त" },
              { value: "KAPHA", label: "Kapha", labelMr: "कफ" },
              {
                value: "VATA_PITTA",
                label: "Vata-Pitta",
                labelMr: "वात-पित्त",
              },
              {
                value: "PITTA_KAPHA",
                label: "Pitta-Kapha",
                labelMr: "पित्त-कफ",
              },
              { value: "VATA_KAPHA", label: "Vata-Kapha", labelMr: "वात-कफ" },
            ],
          },
        ],
      },
    ],
    fieldIds: f,
    createdAt: ts(),
    updatedAt: ts(),
    createdBy: userId,
    updatedBy: userId,
  };

  await db.put(formItem);
  ok(`Form template seeded: Rognpatrak v${version} (${formId})`);
  return { formId, formVersion: version, fieldIds: f };
}

// ── 5. Inventory ──────────────────────────────────────────────────────────────
async function seedInventory(hospitalId, userId) {
  log("Creating 20 inventory items...");

  const items = [
    {
      name: "Triphala Churna",
      category: "CLASSICAL_AYURVEDIC",
      unit: "GRAM",
      purchasePrice: 100,
      sellingPrice: 150,
      currentStock: 500,
      reorderLevel: 50,
      genericName: "Terminalia Chebula compound",
    },
    {
      name: "Ashwagandha Churna",
      category: "CLASSICAL_AYURVEDIC",
      unit: "GRAM",
      purchasePrice: 140,
      sellingPrice: 200,
      currentStock: 400,
      reorderLevel: 50,
      genericName: "Withania somnifera",
    },
    {
      name: "Brahmi Vati",
      category: "CLASSICAL_AYURVEDIC",
      unit: "TABLET",
      purchasePrice: 120,
      sellingPrice: 180,
      currentStock: 300,
      reorderLevel: 30,
      genericName: "Bacopa monnieri compound",
    },
    {
      name: "Tila Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 220,
      sellingPrice: 350,
      currentStock: 2000,
      reorderLevel: 500,
      genericName: "Sesame oil",
    },
    {
      name: "Dashamoola Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 300,
      sellingPrice: 450,
      currentStock: 1500,
      reorderLevel: 500,
      genericName: "Ten root compound oil",
    },
    {
      name: "Bala Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 180,
      sellingPrice: 280,
      currentStock: 1000,
      reorderLevel: 200,
      genericName: "Sida retusa compound",
    },
    {
      name: "Chandraprabha Vati",
      category: "CLASSICAL_AYURVEDIC",
      unit: "TABLET",
      purchasePrice: 140,
      sellingPrice: 220,
      currentStock: 250,
      reorderLevel: 25,
      genericName: "Multi-herb compound",
    },
    {
      name: "Triphala Guggulu",
      category: "CLASSICAL_AYURVEDIC",
      unit: "TABLET",
      purchasePrice: 120,
      sellingPrice: 190,
      currentStock: 200,
      reorderLevel: 25,
      genericName: "Triphala with Guggulu",
    },
    {
      name: "Arjunarishta",
      category: "CLASSICAL_AYURVEDIC",
      unit: "ML",
      purchasePrice: 100,
      sellingPrice: 160,
      currentStock: 900,
      reorderLevel: 100,
      genericName: "Terminalia arjuna fermented",
    },
    {
      name: "Punarnavarishta",
      category: "CLASSICAL_AYURVEDIC",
      unit: "ML",
      purchasePrice: 110,
      sellingPrice: 170,
      currentStock: 900,
      reorderLevel: 100,
      genericName: "Boerhavia diffusa fermented",
    },
    {
      name: "Avipattikar Churna",
      category: "CLASSICAL_AYURVEDIC",
      unit: "GRAM",
      purchasePrice: 85,
      sellingPrice: 130,
      currentStock: 600,
      reorderLevel: 50,
      genericName: "Digestive compound",
    },
    {
      name: "Hingvasthak Churna",
      category: "CLASSICAL_AYURVEDIC",
      unit: "GRAM",
      purchasePrice: 75,
      sellingPrice: 120,
      currentStock: 500,
      reorderLevel: 50,
      genericName: "Asafoetida compound",
    },
    {
      name: "Mahanarayan Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 250,
      sellingPrice: 380,
      currentStock: 1200,
      reorderLevel: 300,
      genericName: "Multi-herb medicated oil",
    },
    {
      name: "Ksheerabala Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 280,
      sellingPrice: 420,
      currentStock: 800,
      reorderLevel: 200,
      genericName: "Milk-processed bala oil",
    },
    {
      name: "Dhanwantharam Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 260,
      sellingPrice: 390,
      currentStock: 1000,
      reorderLevel: 200,
      genericName: "Dhanwanthari compound oil",
    },
    {
      name: "Sahacharadi Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 240,
      sellingPrice: 360,
      currentStock: 900,
      reorderLevel: 200,
      genericName: "Sahachara compound oil",
    },
    {
      name: "Triphala Taila",
      category: "PANCHAKARMA_OIL",
      unit: "ML",
      purchasePrice: 190,
      sellingPrice: 290,
      currentStock: 700,
      reorderLevel: 150,
      genericName: "Triphala medicated oil",
    },
    {
      name: "Cotton Gauze Rolls",
      category: "CONSUMABLE",
      unit: "PIECE",
      purchasePrice: 20,
      sellingPrice: 35,
      currentStock: 200,
      reorderLevel: 50,
      genericName: "",
    },
    {
      name: "Disposable Gloves",
      category: "CONSUMABLE",
      unit: "PIECE",
      purchasePrice: 5,
      sellingPrice: 10,
      currentStock: 500,
      reorderLevel: 100,
      genericName: "",
    },
    {
      name: "Sesame Seeds Bulk",
      category: "HERB",
      unit: "GRAM",
      purchasePrice: 50,
      sellingPrice: 80,
      currentStock: 5000,
      reorderLevel: 500,
      genericName: "Sesamum indicum",
    },
  ];

  const itemIds = [];
  for (const item of items) {
    const itemId = uuidv4();
    const status =
      item.currentStock <= item.reorderLevel ? "LOW_STOCK" : "ACTIVE";
    await db.put({
      PK: `HOSP#${hospitalId}`,
      SK: `INV#${itemId}`,
      "GSI1-PK": `CATEGORY#${item.category}`,
      "GSI1-SK": `NAME#${item.name}`,
      entityType: "INVENTORY_ITEM",
      itemId,
      hospitalId,
      ...item,
      status,
      reorderQuantity: item.reorderLevel * 2,
      supplierName: "Dhootapapeshwar Ltd",
      supplierContact: "02022345678",
      expiryDate: "2026-12-31",
      batchNumber: `BATCH-${new Date().getFullYear()}-001`,
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });
    itemIds.push(itemId);
  }
  ok(`20 inventory items created`);
  return itemIds;
}

// ── 6. Patients ───────────────────────────────────────────────────────────────
async function seedPatients(
  hospitalId,
  branchId,
  doctorIds,
  formId,
  formVersion,
  fieldIds,
  userId,
) {
  log("Creating 5 patients...");

  const patientDefs = [
    {
      name: "Ramesh Narayan Kulkarni",
      mobile: "9876543210",
      addr: "45 Shivaji Nagar, Pune 411005",
    },
    {
      name: "Sunita Vasant Pawar",
      mobile: "9765432109",
      addr: "12 Peth Road, Pune 411002",
    },
    {
      name: "Ganesh Dattatray Shinde",
      mobile: "9654321098",
      addr: "78 MG Road, Nashik 422001",
    },
    {
      name: "Laxmi Shankar Deshmukh",
      mobile: "9543210987",
      addr: "23 Camp Area, Pune 411001",
    },
    {
      name: "Vijay Pandurang Jadhav",
      mobile: "9432109876",
      addr: "56 Deccan Gymkhana, Pune 411004",
    },
  ];

  const patientIds = [];
  let uhidCounter = 1;

  for (let i = 0; i < patientDefs.length; i++) {
    const p = patientDefs[i];
    const patientId = uuidv4();
    const uhid = `MAY-${String(uhidCounter++).padStart(4, "0")}`;
    const doctorId = doctorIds[i % doctorIds.length];

    const responses = {};
    if (fieldIds) {
      responses[fieldIds.patientNameId] = p.name;
      responses[fieldIds.ageId] = 35 + i * 5;
      responses[fieldIds.genderId] = i % 3 === 1 ? "FEMALE" : "MALE";
      responses[fieldIds.addressId] = p.addr;
      responses[fieldIds.occupationId] = [
        "Farmer",
        "Teacher",
        "Business",
        "Housewife",
        "Engineer",
      ][i];
      responses[fieldIds.chiefComplaintId] = [
        "जीर्ण पित्त",
        "सांधेदुखी",
        "पाठदुखी",
        "त्वचारोग",
        "मज्जासंस्था विकार",
      ][i];
      responses[fieldIds.durationId] = [
        "3 months",
        "6 months",
        "1 year",
        "2 months",
        "8 months",
      ][i];
      responses[fieldIds.pastHistoryId] = "HTN, on medication";
      responses[fieldIds.familyHistoryId] = "Diabetes - father";
      responses[fieldIds.prakrutiId] = [
        "VATA_PITTA",
        "KAPHA",
        "VATA",
        "PITTA_KAPHA",
        "VATA_PITTA",
      ][i];
    }

    const patientItem = {
      PK: `HOSP#${hospitalId}#BRANCH#${branchId}`,
      SK: `PATIENT#${patientId}`,
      entityType: "PATIENT",
      patientId,
      hospitalId,
      branchId,
      uhid,
      patientName: p.name,
      mobileNumber: p.mobile,
      assignedDoctorId: doctorId,
      tokenNumber: i + 1,
      registrationDate: ts(),
      formData: { formTemplateId: formId, formVersion, responses },
      status: "ACTIVE",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
      // GSI attributes for mobile search
      mobileNumber: p.mobile,
      "GSI3-PK": p.mobile,
      "GSI3-SK": patientId,
      hospitalId,
    };

    await db.put(patientItem);
    patientIds.push(patientId);
    ok(`Patient: ${p.name} (${uhid})`);
  }

  return patientIds;
}

// ── 7. Consultations ──────────────────────────────────────────────────────────
async function seedConsultations(
  hospitalId,
  branchId,
  patientIds,
  doctorIds,
  userId,
) {
  log("Creating 2 consultations...");

  const consultDefs = [
    {
      patientId: patientIds[0],
      doctorId: doctorIds[0],
      chiefComplaint:
        "जीर्ण पित्त — Chronic acidity with burning sensation, nausea",
      clinicalExamination: {
        generalCondition: "Fair",
        vitalSigns: {
          bp: "130/80",
          pulse: 78,
          temperature: 98.6,
          weight: 72,
          height: 170,
        },
        ashtavidhaPariksha: {
          nadi: "Pittaj",
          mala: "Samyak",
          mutra: "Pita varna, adhika",
          jihwa: "Pitta avarana",
          shabda: "Spashta",
          sparsha: "Ushna",
          drik: "Samyak",
          akriti: "Madhyam",
        },
        ayurvedicDiagnosis: {
          dosha: { vata: false, pitta: true, kapha: false },
          avastha: "Sthana sanshraya",
          treatmentPrinciple: "Pitta shamana, Deepana Pachana",
        },
      },
    },
    {
      patientId: patientIds[1],
      doctorId: doctorIds[1],
      chiefComplaint:
        "Amavata — Joint pain with morning stiffness, bilateral knees",
      clinicalExamination: {
        generalCondition: "Moderate",
        vitalSigns: {
          bp: "140/85",
          pulse: 82,
          temperature: 99.1,
          weight: 68,
          height: 155,
        },
        ashtavidhaPariksha: {
          nadi: "Vataj",
          mala: "Vibandha",
          mutra: "Alpata",
          jihwa: "Sama",
          shabda: "Spashta",
          sparsha: "Sheeta, Ruksha",
          drik: "Samyak",
          akriti: "Krushatanu",
        },
        ayurvedicDiagnosis: {
          dosha: { vata: true, pitta: false, kapha: true },
          avastha: "Vyakta avastha",
          treatmentPrinciple: "Ama pachana, Vata shamana, Swedana therapy",
        },
      },
    },
  ];

  const consultIds = [];
  for (const c of consultDefs) {
    const consultId = uuidv4();
    const consultItem = {
      PK: `PATIENT#${c.patientId}`,
      SK: `CONSULT#${consultId}`,
      "GSI1-PK": `HOSP#${hospitalId}`,
      "GSI1-SK": `CONSULT#${consultId}`,
      "GSI2-PK": hospitalId,
      "GSI2-SK": ts(),
      entityType: "CONSULTATION",
      consultId,
      hospitalId,
      branchId,
      patientId: c.patientId,
      doctorId: c.doctorId,
      tokenId: uuidv4(),
      chiefComplaint: c.chiefComplaint,
      clinicalExamination: c.clinicalExamination,
      status: "COMPLETED",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    };
    await db.put(consultItem);
    consultIds.push(consultId);
    ok(`Consultation: ${consultId} for patient ${c.patientId.slice(-8)}`);
  }

  return consultIds;
}

// ── 8. Prescriptions ─────────────────────────────────────────────────────────
async function seedPrescriptions(
  hospitalId,
  patientIds,
  consultIds,
  doctorIds,
  itemIds,
  userId,
) {
  log("Creating 2 prescriptions...");

  const rxDefs = [
    {
      consultId: consultIds[0],
      patientId: patientIds[0],
      medicines: [
        {
          medicineName: "Avipattikar Churna",
          dosageForm: "CHURNA",
          dosageQty: 5,
          frequency: "TWICE_DAILY",
          timing: "BEFORE_MEALS",
          durationDays: 30,
          specialInstructions: "With warm water",
        },
        {
          medicineName: "Chandraprabha Vati",
          dosageForm: "TABLET",
          dosageQty: 2,
          frequency: "TWICE_DAILY",
          timing: "AFTER_MEALS",
          durationDays: 30,
        },
        {
          medicineName: "Arjunarishta",
          dosageForm: "KADHA",
          dosageQty: 20,
          frequency: "TWICE_DAILY",
          timing: "AFTER_MEALS",
          durationDays: 30,
          specialInstructions: "Dilute with equal water",
        },
      ],
      treatments: [],
      dietInstructions: {
        pathya: [
          "Light easily digestible food",
          "Coconut water",
          "Pomegranate",
        ],
        apathya: [
          "Spicy food",
          "Fried items",
          "Cold beverages",
          "Fermented foods",
        ],
      },
      lifestyleInstructions: {
        rest: "Adequate sleep",
        yoga: "Bhujangasana, Pawanmuktasana",
        prohibitedActivities: "Excessive physical exertion",
      },
      followUpDate: "2026-05-10",
    },
    {
      consultId: consultIds[1],
      patientId: patientIds[1],
      medicines: [
        {
          medicineName: "Triphala Guggulu",
          dosageForm: "TABLET",
          dosageQty: 2,
          frequency: "THRICE_DAILY",
          timing: "BEFORE_MEALS",
          durationDays: 45,
        },
        {
          medicineName: "Ashwagandha Churna",
          dosageForm: "CHURNA",
          dosageQty: 5,
          frequency: "TWICE_DAILY",
          timing: "WITH_MEALS",
          durationDays: 45,
          specialInstructions: "With warm milk",
        },
      ],
      treatments: [
        {
          treatmentType: "ABHYANGA",
          notes: "Apply Mahanarayan Taila, 30 min daily for 7 days",
        },
      ],
      dietInstructions: {
        pathya: ["Warm soup", "Ginger tea", "Sesame seeds"],
        apathya: ["Cold water", "Curd", "Heavy non-veg"],
      },
      lifestyleInstructions: {
        rest: "Rest joints",
        yoga: "Gentle Yoga only",
        exercise: "Walking 20 min",
      },
      followUpDate: "2026-05-20",
    },
  ];

  const rxIds = [];
  for (const rx of rxDefs) {
    const rxId = uuidv4();
    await db.put({
      PK: `PATIENT#${rx.patientId}`,
      SK: `RX#${rx.consultId}#${rxId}`,
      entityType: "PRESCRIPTION",
      rxId,
      hospitalId,
      patientId: rx.patientId,
      consultId: rx.consultId,
      doctorId: doctorIds[rxIds.length % doctorIds.length],
      medicines: rx.medicines,
      treatments: rx.treatments,
      dietInstructions: rx.dietInstructions,
      lifestyleInstructions: rx.lifestyleInstructions,
      followUpDate: rx.followUpDate,
      status: "ACTIVE",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });
    rxIds.push(rxId);
    ok(`Prescription: ${rxId}`);
  }

  return rxIds;
}

// ── 9. Panchakarma ────────────────────────────────────────────────────────────
async function seedPanchakarma(
  hospitalId,
  branchId,
  patientIds,
  doctorIds,
  itemIds,
  userId,
) {
  log("Creating 1 Panchakarma plan (BASTI, 7 sessions)...");

  const pkId = uuidv4();
  const patientId = patientIds[1]; // Patient with joint pain
  const doctorId = doctorIds[0];

  await db.put({
    PK: `PATIENT#${patientId}`,
    SK: `PK#${pkId}`,
    "GSI1-PK": `HOSP#${hospitalId}`,
    "GSI1-SK": `PK#${pkId}`,
    entityType: "PANCHAKARMA_PLAN",
    pkId,
    hospitalId,
    branchId,
    patientId,
    doctorId,
    procedureType: "BASTI",
    totalSessions: 7,
    completedSessions: 3,
    startDate: "2026-04-01",
    endDate: "2026-04-10",
    status: "IN_PROGRESS",
    billingMode: "PER_SESSION",
    preProcedure: {
      snehapanaOil: "Mahanarayan Taila",
      snehapanaQty: "60ml",
      abhyangaDays: 3,
      swedanaDays: 3,
    },
    materialsRequired: [
      {
        inventoryItemId: itemIds[4],
        itemName: "Dashamoola Taila",
        quantity: 200,
        unit: "ML",
      },
      {
        inventoryItemId: itemIds[18],
        itemName: "Disposable Gloves",
        quantity: 7,
        unit: "PIECE",
      },
    ],
    createdAt: ts(),
    updatedAt: ts(),
    createdBy: userId,
    updatedBy: userId,
  });

  // Create 3 completed sessions
  for (let s = 1; s <= 3; s++) {
    const sessionId = uuidv4();
    await db.put({
      PK: `PATIENT#${patientId}`,
      SK: `PKSESSION#${pkId}#${sessionId}`,
      entityType: "PK_SESSION",
      sessionId,
      pkId,
      patientId,
      hospitalId,
      sessionNumber: s,
      date: `2026-04-0${s}`,
      therapistId: doctorId,
      vitalsBefore: { bp: "140/85", pulse: 80 },
      vitalsAfter: { bp: "132/82", pulse: 76 },
      materialsUsed: [
        {
          inventoryItemId: itemIds[4],
          itemName: "Dashamoola Taila",
          quantity: 25,
          unit: "ML",
        },
      ],
      observations: `Session ${s}: Patient tolerated well. Mild improvement in pain.`,
      doctorNotes: `Continue therapy. Stiffness reducing.`,
      status: "COMPLETED",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });
  }

  ok(`Panchakarma plan: ${pkId} (3/7 sessions completed)`);
  return pkId;
}

// ── 10. Bills ─────────────────────────────────────────────────────────────────
async function seedBills(
  hospitalId,
  branchId,
  patientIds,
  consultIds,
  rxIds,
  itemIds,
  userId,
) {
  log("Creating 2 bills...");

  const billDefs = [
    {
      patientId: patientIds[0],
      consultId: consultIds[0],
      lineItems: [
        {
          type: "CONSULTATION",
          description: "Consultation Fee - Dr. Shashikant Kumar",
          quantity: 1,
          unitPrice: 500,
        },
        {
          type: "MEDICINE",
          inventoryItemId: itemIds[0],
          description: "Avipattikar Churna 100g",
          quantity: 1,
          unitPrice: 130,
        },
        {
          type: "MEDICINE",
          inventoryItemId: itemIds[6],
          description: "Chandraprabha Vati 60tabs",
          quantity: 1,
          unitPrice: 220,
        },
      ],
      taxRate: 0,
      paidAmount: 850,
      status: "PAID",
    },
    {
      patientId: patientIds[1],
      consultId: consultIds[1],
      lineItems: [
        {
          type: "CONSULTATION",
          description: "Consultation Fee - Dr. Mangesh Thamke",
          quantity: 1,
          unitPrice: 500,
        },
        {
          type: "MEDICINE",
          inventoryItemId: itemIds[7],
          description: "Triphala Guggulu 60tabs",
          quantity: 2,
          unitPrice: 190,
        },
        {
          type: "THERAPY",
          description: "Abhyanga Therapy - 7 sessions",
          quantity: 7,
          unitPrice: 800,
        },
      ],
      taxRate: 5,
      paidAmount: 1500,
      status: "PARTIALLY_PAID",
    },
  ];

  const billIds = [];
  for (const b of billDefs) {
    const billId = uuidv4();
    const lineTotal = b.lineItems.reduce(
      (s, l) => s + l.quantity * l.unitPrice,
      0,
    );
    const taxAmount = Math.round(lineTotal * (b.taxRate / 100));
    const totalAmount = lineTotal + taxAmount;
    const balanceDue = totalAmount - b.paidAmount;
    const billDate = new Date().toISOString().split("T")[0];

    await db.put({
      PK: `PATIENT#${b.patientId}`,
      SK: `BILL#${billId}`,
      "GSI1-PK": `HOSP#${hospitalId}`,
      "GSI1-SK": `DATE#${billDate}`,
      entityType: "BILL",
      billId,
      hospitalId,
      branchId,
      patientId: b.patientId,
      consultId: b.consultId,
      lineItems: b.lineItems,
      lineTotal,
      taxRate: b.taxRate,
      taxAmount,
      totalAmount,
      paidAmount: b.paidAmount,
      balanceDue,
      billDate,
      status: b.status,
      payments: [
        {
          paymentId: uuidv4(),
          amount: b.paidAmount,
          mode: "CASH",
          paidAt: ts(),
          reference: "",
        },
      ],
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: userId,
      updatedBy: userId,
    });

    billIds.push(billId);
    ok(`Bill: ${billId} (${b.status}, ₹${totalAmount}, paid ₹${b.paidAmount})`);
  }

  return billIds;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await initConfig();
    docClient = getDocClient();

    const { hospitalId, userId, accessToken } = await seedHospital();
    const { mainBranchId } = await seedBranches(hospitalId, userId);
    const doctorIds = await seedDoctors(hospitalId, mainBranchId, userId);
    const { formId, formVersion, fieldIds } = await seedFormTemplate(
      hospitalId,
      userId,
    );
    const itemIds = await seedInventory(hospitalId, userId);
    const patientIds = await seedPatients(
      hospitalId,
      mainBranchId,
      doctorIds,
      formId,
      formVersion,
      fieldIds,
      userId,
    );
    const consultIds = await seedConsultations(
      hospitalId,
      mainBranchId,
      patientIds,
      doctorIds,
      userId,
    );
    const rxIds = await seedPrescriptions(
      hospitalId,
      patientIds,
      consultIds,
      doctorIds,
      itemIds,
      userId,
    );
    const pkId = await seedPanchakarma(
      hospitalId,
      mainBranchId,
      patientIds,
      doctorIds,
      itemIds,
      userId,
    );
    const billIds = await seedBills(
      hospitalId,
      mainBranchId,
      patientIds,
      consultIds,
      rxIds,
      itemIds,
      userId,
    );

    const output = {
      hospitalId,
      branchId: mainBranchId,
      accessToken,
      testPatientId: patientIds[0],
      testConsultId: consultIds[0],
      testRxId: rxIds[0],
      testPkId: pkId,
      testBillId: billIds[0],
      message: "Seed complete. Use accessToken for API testing.",
    };

    console.log("\n" + "─".repeat(60));
    console.log("🎉  SEED OUTPUT");
    console.log("─".repeat(60));
    console.log(JSON.stringify(output, null, 2));
    console.log("─".repeat(60) + "\n");
  } catch (err) {
    console.error("\n❌  Seed failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
