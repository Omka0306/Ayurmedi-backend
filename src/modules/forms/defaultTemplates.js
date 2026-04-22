import { v4 as uuidv4 } from "uuid";

const generateId = () => uuidv4();

export const getRognpatrakTemplate = () => ({
  formType: "PATIENT_HISTORY",
  name: "Detailed Medical History (Rognpatrak)",
  nameMr: "रुग्णपत्रक",
  sections: [
    {
      sectionId: generateId(),
      title: "Doctor Selection",
      titleMr: "डॉक्टर निवड",
      order: 1,
      fields: [
        {
          fieldId: generateId(),
          name: "doctorId",
          label: "Treating Doctor",
          labelMr: "उपचार करणारे डॉक्टर",
          type: "TEXT",
          required: true,
          order: 1
        }
      ]
    },
    {
      sectionId: generateId(),
      title: "Basic Patient Info",
      titleMr: "रुग्णाची प्राथमिक माहिती",
      order: 2,
      fields: [
        { fieldId: generateId(), name: "patientName", label: "Patient Name", labelMr: "रुग्णाचे नाव", type: "TEXT", required: true, order: 1 },
        { fieldId: generateId(), name: "address", label: "Address", labelMr: "पत्ता", type: "TEXTAREA", required: true, order: 2 },
        { fieldId: generateId(), name: "tokenNumber", label: "Token Number", labelMr: "टोकन क्रमांक", type: "NUMBER", required: false, order: 3 },
        { fieldId: generateId(), name: "date", label: "Date", labelMr: "दिनांक", type: "DATE", required: true, order: 4 },
        { fieldId: generateId(), name: "age", label: "Age", labelMr: "वय", type: "NUMBER", required: true, order: 5 },
        { fieldId: generateId(), name: "email", label: "Email ID", labelMr: "ई-मेल आयडी", type: "EMAIL", required: false, order: 6 },
        { fieldId: generateId(), name: "phone", label: "Phone Number", labelMr: "फोन नंबर", type: "PHONE", required: false, order: 7 },
        { fieldId: generateId(), name: "mobile", label: "Mobile Number", labelMr: "मोबाईल नंबर", type: "PHONE", required: true, order: 8 },
        { fieldId: generateId(), name: "education", label: "Education", labelMr: "शिक्षण", type: "TEXT", required: false, order: 9 },
        { fieldId: generateId(), name: "birthDate", label: "Date of Birth", labelMr: "जन्मदिनांक", type: "DATE", required: false, order: 10 },
        { fieldId: generateId(), name: "birthPlace", label: "Place of Birth", labelMr: "जन्म ठिकाण", type: "TEXT", required: false, order: 11 },
        { fieldId: generateId(), name: "weight", label: "Weight (kg)", labelMr: "वजन (किलो)", type: "NUMBER", required: true, order: 12 },
        { fieldId: generateId(), name: "profession", label: "Profession", labelMr: "व्यवसाय", type: "TEXT", required: false, order: 13 },
        { fieldId: generateId(), name: "spouseOccupation", label: "Spouse Occupation", labelMr: "पती/पत्नीचा व्यवसाय", type: "TEXT", required: false, order: 14 },
        { fieldId: generateId(), name: "chiefComplaint", label: "Chief Complaint", labelMr: "मुख्य तक्रार", type: "TEXTAREA", required: true, order: 15 },
        { fieldId: generateId(), name: "recentComplaints", label: "Recent Complaints", labelMr: "सध्याच्या तक्रारी", type: "TEXTAREA", required: false, order: 16 }
      ]
    },
    {
      sectionId: generateId(),
      title: "Chief Complaint & Duration",
      titleMr: "मुख्य तक्रार आणि कालावधी",
      order: 3,
      fields: [
        { fieldId: generateId(), name: "primaryComplaint", label: "Primary Complaint", labelMr: "प्राथमिक तक्रार", type: "TEXTAREA", required: true, order: 1 },
        { fieldId: generateId(), name: "duration", label: "Duration", labelMr: "कालावधी", type: "TEXT", required: true, order: 2 },
        { fieldId: generateId(), name: "reliefStatus", label: "Relief/No Relief", labelMr: "आराम / आराम नाही", type: "RADIO", required: true, order: 3, options: [
          { value: "RELIEF", label: "Relief", labelMr: "आराम" },
          { value: "NO_RELIEF", label: "No Relief", labelMr: "आराम नाही" }
        ]}
      ]
    },
    {
      sectionId: generateId(),
      title: "Current Medications",
      titleMr: "सध्याची औषधे",
      order: 4,
      fields: [
        { fieldId: generateId(), name: "medicationList", label: "List of Medicines", labelMr: "औषधांची यादी", type: "TEXTAREA", required: false, order: 1 }
      ]
    },
    {
      sectionId: generateId(),
      title: "Medical History",
      titleMr: "वैद्यकीय इतिहास",
      order: 5,
      fields: [
        { fieldId: generateId(), name: "pastIllnesses", label: "Past Illnesses", labelMr: "मागील आजार", type: "MULTI_SELECT", required: false, order: 1, options: [
          { value: "CHICKENPOX", label: "Chickenpox", labelMr: "कांजिण्या" },
          { value: "CONJUNCTIVITIS", label: "Conjunctivitis", labelMr: "डोळे येणे" },
          { value: "MALARIA", label: "Malaria", labelMr: "मलेरिया" },
          { value: "TYPHOID", label: "Typhoid", labelMr: "टायफॉइड" },
          { value: "MEASLES", label: "Measles", labelMr: "गोवर" },
          { value: "PERTUSSIS", label: "Measles / Pertussis", labelMr: "डांग्या खोकला" },
          { value: "HEP_JAUNDICE", label: "Hepatitis/Jaundice", labelMr: "कावीळ" },
          { value: "MUMPS", label: "Mumps", labelMr: "गालफुगी" },
          { value: "DENGUE", label: "Dengue", labelMr: "डेंग्यू" }
        ]}
      ]
    },
    {
      sectionId: generateId(),
      title: "Family History",
      titleMr: "कौटुंबिक इतिहास",
      order: 6,
      fields: [
        { fieldId: generateId(), name: "paternalHistory", label: "Paternal History", labelMr: "वडिलांच्या बाजूचा इतिहास", type: "MULTI_SELECT", required: false, order: 1, options: [
          { value: "BP", label: "Blood Pressure", labelMr: "रक्तदाब" },
          { value: "DIABETES", label: "Diabetes", labelMr: "मधुमेह" },
          { value: "ASTHMA", label: "Asthma", labelMr: "दमा" },
          { value: "HEART", label: "Heart Disease", labelMr: "हृदयरोग" },
          { value: "CANCER", label: "Cancer", labelMr: "कर्कराेग" }
        ]},
        { fieldId: generateId(), name: "maternalHistory", label: "Maternal History", labelMr: "आईच्या बाजूचा इतिहास", type: "MULTI_SELECT", required: false, order: 2, options: [
          { value: "BP", label: "Blood Pressure", labelMr: "रक्तदाब" },
          { value: "DIABETES", label: "Diabetes", labelMr: "मधुमेह" },
          { value: "ASTHMA", label: "Asthma", labelMr: "दमा" },
          { value: "HEART", label: "Heart Disease", labelMr: "हृदयरोग" },
          { value: "CANCER", label: "Cancer", labelMr: "कर्कराेग" }
        ]}
      ]
    }
  ]
});
