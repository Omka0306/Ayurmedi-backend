const STAGE = process.env.STAGE || process.env.NODE_ENV || "dev";

module.exports = {
  STAGE,
  AWS_REGION: process.env.AWS_REGION || "ap-south-1",

  USER_POOL_ID: process.env.USER_POOL_ID,
  USER_POOL_CLIENT_ID: process.env.USER_POOL_CLIENT_ID,

  // ─── DynamoDB Tables ───────────────────────────────────
  TABLES: {
    HOSPITALS:
      process.env.HOSPITALS_TABLE || `ayurmedi-backend-hospitals-${STAGE}`,
    USERS: process.env.USERS_TABLE || `ayurmedi-backend-users-${STAGE}`,
    BRANCHES:
      process.env.BRANCHES_TABLE || `ayurmedi-backend-branches-${STAGE}`,
    PATIENTS:
      process.env.PATIENTS_TABLE || `ayurmedi-backend-patients-${STAGE}`,
    FORM_CONFIGS:
      process.env.FORM_CONFIGS_TABLE ||
      `ayurmedi-backend-form-configs-${STAGE}`,
    CONSULTATIONS:
      process.env.CONSULTATIONS_TABLE ||
      `ayurmedi-backend-consultations-${STAGE}`,
    PRESCRIPTIONS:
      process.env.PRESCRIPTIONS_TABLE ||
      `ayurmedi-backend-prescriptions-${STAGE}`,
    PANCHAKARMA_PLANS:
      process.env.PANCHAKARMA_PLANS_TABLE ||
      `ayurmedi-backend-pk-plans-${STAGE}`,
    PANCHAKARMA_SESSIONS:
      process.env.PANCHAKARMA_SESSIONS_TABLE ||
      `ayurmedi-backend-pk-sessions-${STAGE}`,
    TOKENS: process.env.TOKENS_TABLE || `ayurmedi-backend-tokens-${STAGE}`,
    BILLS: process.env.BILLS_TABLE || `ayurmedi-backend-bills-${STAGE}`,
    INVENTORY_ITEMS:
      process.env.INVENTORY_ITEMS_TABLE ||
      `ayurmedi-backend-inventory-items-${STAGE}`,
    STOCK_MOVEMENTS:
      process.env.STOCK_MOVEMENTS_TABLE ||
      `ayurmedi-backend-stock-movements-${STAGE}`,
    AUDIT_LOG: process.env.AUDIT_LOG_TABLE || `ayurmedi-backend-audit-${STAGE}`,
  },

  // ─── User Roles ────────────────────────────────────────
  ROLES: {
    SUPER_ADMIN: "SUPER_ADMIN",
    HOSPITAL_ADMIN: "HOSPITAL_ADMIN",
    DOCTOR: "DOCTOR",
    ASSISTANT: "ASSISTANT",
    RECEPTION: "RECEPTION",
  },

  // ─── Token Status ──────────────────────────────────────
  TOKEN_STATUS: {
    WAITING: "WAITING",
    IN_CONSULT: "IN_CONSULT",
    COMPLETED: "COMPLETED",
    SKIPPED: "SKIPPED",
    ABSENT: "ABSENT",
  },

  // ─── Payment Modes ─────────────────────────────────────
  PAYMENT_MODE: {
    CASH: "CASH",
    UPI: "UPI",
    CARD: "CARD",
    BANK_TRANSFER: "BANK_TRANSFER",
    INSURANCE: "INSURANCE",
  },

  // ─── Doshas ────────────────────────────────────────────
  DOSHA: {
    VATA: "VATA",
    PITTA: "PITTA",
    KAPHA: "KAPHA",
    VATA_PITTA: "VATA_PITTA",
    PITTA_KAPHA: "PITTA_KAPHA",
    VATA_KAPHA: "VATA_KAPHA",
    TRIDOSHA: "TRIDOSHA",
  },

  // ─── Panchakarma Procedure Types ───────────────────────
  PANCHAKARMA_PROCEDURE: {
    VAMANA: "VAMANA",
    VIRECHANA: "VIRECHANA",
    BASTI: "BASTI",
    NASYA: "NASYA",
    RAKTAMOKSHANA: "RAKTAMOKSHANA",
    ABHYANGA: "ABHYANGA",
    SWEDANA: "SWEDANA",
    SHIRODHARA: "SHIRODHARA",
    KATI_BASTI: "KATI_BASTI",
    SHIRO_BASTI: "SHIRO_BASTI",
    OTHER: "OTHER",
  },

  // ─── Stock Movement Types ──────────────────────────────
  STOCK_MOVEMENT: {
    PURCHASE: "PURCHASE",
    DISPENSED: "DISPENSED",
    ADJUSTMENT: "ADJUSTMENT",
    RETURN: "RETURN",
    EXPIRED: "EXPIRED",
    WASTAGE: "WASTAGE",
  },

  // ─── Inventory Categories ──────────────────────────────
  INVENTORY_CATEGORY: {
    CLASSICAL: "CLASSICAL",
    PROPRIETARY: "PROPRIETARY",
    PK_OIL: "PK_OIL",
    HERB: "HERB",
    CONSUMABLE: "CONSUMABLE",
  },

  // ─── Form Types ────────────────────────────────────────
  FORM_TYPE: {
    PATIENT_INTAKE: "PATIENT_INTAKE",
    LIFESTYLE_HISTORY: "LIFESTYLE_HISTORY",
    CLINICAL_EXAM: "CLINICAL_EXAM",
    DIET_HISTORY: "DIET_HISTORY",
  },

  // ─── Prescription Dosage Timing ────────────────────────
  DOSE_TIMING: {
    BEFORE_MEALS: "BEFORE_MEALS",
    AFTER_MEALS: "AFTER_MEALS",
    WITH_MEALS: "WITH_MEALS",
    BEDTIME: "BEDTIME",
    EMPTY_STOMACH: "EMPTY_STOMACH",
    MORNING: "MORNING",
    EVENING: "EVENING",
  },

  // ─── Bill Status ───────────────────────────────────────
  BILL_STATUS: {
    PENDING: "PENDING",
    PARTIAL: "PARTIAL",
    PAID: "PAID",
    CANCELLED: "CANCELLED",
  },

  // ─── Plan Status ───────────────────────────────────────
  PLAN_STATUS: {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },

  // ─── Expiry Alert Thresholds (days) ────────────────────
  EXPIRY_THRESHOLDS: [30, 60, 90],
};
