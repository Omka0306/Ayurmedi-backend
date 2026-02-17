const STAGE = process.env.STAGE || process.env.NODE_ENV || 'dev';

module.exports = {
  STAGE,
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',

  USER_POOL_ID: process.env.USER_POOL_ID,
  USER_POOL_CLIENT_ID: process.env.USER_POOL_CLIENT_ID,

  TABLES: {
    HOSPITALS: process.env.HOSPITALS_TABLE || `ayurmedi-backend-hospitals-${STAGE}`,
    USERS: process.env.USERS_TABLE || `ayurmedi-backend-users-${STAGE}`,
    MEDICINES: process.env.MEDICINES_TABLE || `ayurmedi-backend-medicines-${STAGE}`,
    DROPDOWN_CATEGORIES: process.env.DROPDOWN_CATEGORIES_TABLE || `ayurmedi-backend-dropdown-categories-${STAGE}`,
    DROPDOWN_OPTIONS: process.env.DROPDOWN_OPTIONS_TABLE || `ayurmedi-backend-dropdown-options-${STAGE}`,
    DISEASES: process.env.DISEASES_TABLE || `ayurmedi-backend-diseases-${STAGE}`,
    TREATMENTS: process.env.TREATMENTS_TABLE || `ayurmedi-backend-treatments-${STAGE}`,
    PRESCRIPTION_TEMPLATES: process.env.PRESCRIPTION_TEMPLATES_TABLE || `ayurmedi-backend-prescription-templates-${STAGE}`,
    PATIENTS: process.env.PATIENTS_TABLE || `ayurmedi-backend-patients-${STAGE}`,
    VISITS: process.env.VISITS_TABLE || `ayurmedi-backend-visits-${STAGE}`,
    PATIENT_HISTORIES: process.env.PATIENT_HISTORIES_TABLE || `ayurmedi-backend-patient-histories-${STAGE}`,
    PRESCRIPTIONS: process.env.PRESCRIPTIONS_TABLE || `ayurmedi-backend-prescriptions-${STAGE}`,
    PRESCRIPTION_ITEMS: process.env.PRESCRIPTION_ITEMS_TABLE || `ayurmedi-backend-prescription-items-${STAGE}`,
  },

  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
    DOCTOR: 'DOCTOR',
    RECEPTION: 'RECEPTION',
    ASSISTANT: 'ASSISTANT',
  },

  LANGUAGES: {
    MARATHI: 'mr',
    ENGLISH: 'en',
  },
};

