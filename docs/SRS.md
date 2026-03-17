# Mitram Ayurveda — Hospital Management System

## Software Requirements Specification (SRS) v1.0

---

## Project Overview

Multi-tenant Ayurvedic Hospital Management System serving multiple hospitals and their
branches. Each hospital is an independent tenant with its own data, users, forms,
inventory, and configuration. Initial development scope covers the Ayurvedic module only.

## Tech Stack

- Frontend: Next.js (App Router)
- Backend: Node.js with Express or Next.js API routes
- Database: PostgreSQL with Prisma ORM
- Styling: Tailwind CSS
- PDF Generation: React-PDF or Puppeteer
- Auth: NextAuth.js

---

## Roles

1. Super Admin — Developer level. Full unrestricted access to all hospitals, branches,
   users, data, logs, system config. Can impersonate any role. Manages the platform itself.
2. Hospital Admin — Manages one hospital: config, users, form templates, reports,
   analytics, inventory settings.
3. Doctor (Vaidya) — Consultations, prescriptions, Panchakarma planning, patient history,
   clinical examination.
4. Assistant Doctor — Assists doctor, updates patient records, manages follow-up tasks.
5. Receptionist — Patient registration, token/queue management, appointment scheduling.

> Note: For v1.0 all roles have access to all modules. RBAC will be enforced later.

---

## Module Build Order

Build strictly in this sequence — each module depends on the previous:

1. Project setup + Database schema
2. Authentication + All 5 roles (including Super Admin)
3. Dynamic Form Engine (CRITICAL — all patient forms depend on this)
4. Patient Registration Form (uses Dynamic Form Engine)
5. Patient History & Lifestyle Form (uses Dynamic Form Engine)
6. Clinical Examination Form — Doctor only (uses Dynamic Form Engine)
7. Prescription & Treatment Plan
8. Panchakarma Treatment Management
9. Token & Queue Management
10. Billing & Invoice Generation
11. Inventory & Pharmacy Management
12. Reports & PDF Generation
13. Hospital Dashboard & Analytics
14. Multi-hospital & Branch Architecture

---

## Module 1 — Authentication & Roles

### Super Admin

- Full access to everything: all hospitals, all branches, all patient data, all configs
- Can create / delete hospitals and branches
- Can impersonate any hospital admin, doctor, or receptionist
- Can view system logs and audit trails
- Cannot be created from the UI — seeded directly in the database

### Hospital Admin

- Manages their own hospital only
- Can create/edit/delete users within their hospital
- Can customize form templates for their hospital
- Can view all reports and analytics for their hospital

### Doctor

- Can view and update patient records assigned to their hospital
- Can write prescriptions and plan Panchakarma treatments
- Can access the clinical examination form
- Cannot access billing or inventory management in v1.0

### Assistant Doctor

- Same as Doctor access in v1.0

### Receptionist

- Can register new patients
- Can manage the token queue
- Cannot access clinical examination or prescriptions

---

## Module 2 — Dynamic Form Engine (CRITICAL)

This is the most important module. Every patient form in the system must be
built using this engine. No form should ever be hardcoded.

### Rules

- Forms are defined as JSON schema stored in the database
- Each hospital has its own copy of each form template
- Changes to one hospital's form never affect another hospital
- Form versions are maintained for audit and historical comparison

### Field Types Supported

- Text input
- Number input
- Email input
- Phone input
- Date picker
- Time picker
- DateTime picker
- Dropdown (single select)
- Multi-select
- Radio button group
- Checkbox group
- Textarea
- Section heading (non-input, for grouping)
- Repeatable group (e.g. list of medicines)

### Form Configuration Per Field

- Field label (supports Marathi and English)
- Field type
- Placeholder text
- Mandatory / Optional toggle
- Validation rules: min, max, regex, format
- Default value
- Visibility conditions (show this field only if another field has a specific value)
- Display order (drag and drop reordering)

### Forms in the System

1. Patient Registration Form (Rognpatrak Page 1)
2. Patient History & Lifestyle Form (Rognpatrak Page 2)
3. Clinical Examination Form (Rognpatrak Page 3 — doctor only)
4. Prescription Form
5. Panchakarma Treatment Form

---

## Module 3 — Patient Registration Form

Based on Rognpatrak Page 1 from Mitram Ayurveda.

### Section A — Doctor Selection

- Select treating doctor from registered doctors of that hospital/branch
- Show doctor availability status

### Section B — Basic Patient Information

| Field                         | Type            | Notes                           |
| ----------------------------- | --------------- | ------------------------------- |
| Patient Name                  | Text            | Full name                       |
| Address                       | Textarea        | Full residential address        |
| Serial / Token Number         | Auto-generated  | System assigned                 |
| Date                          | Date            | Registration date               |
| Age                           | Number          | In years                        |
| Email Address                 | Email           | Optional                        |
| Phone                         | Phone           | Landline                        |
| Mobile Number                 | Phone           | Primary contact, mandatory      |
| Education                     | Text / Dropdown | Qualification                   |
| Birth Date & Time             | DateTime        | Required for Ayurvedic analysis |
| Birthplace                    | Text            | City or village                 |
| Weight                        | Number (kg)     | In kilograms                    |
| Occupation / Profession       | Text            | Patient's job                   |
| Spouse or Father's Occupation | Text            | Husband's or father's work      |
| Current Ailment               | Textarea        | Main reason for visit           |
| Recent Physical Complaints    | Textarea        | All minor current complaints    |

### Section C — Chief Complaint

- Primary complaint / pain (प्रधान वेदना)
- Duration of complaint (कालावधी)
- Relief or no relief (उपशय / अनुपशय) — what gives relief or aggravates

### Section D — Current Medications

- List of all medicines currently being taken
- Expandable list — minimum 3 fields, can add more

### Section E — Past Illness History (Checkbox list)

Chickenpox, Conjunctivitis, Malaria, Typhoid, Cough, Vomiting, Worms,
Leg swelling, Ear pain, Nosebleed, Tonsillitis, Pneumonia, Bone fracture,
Skin disease, Gastro, Kidney stones, Acidity, Uterus issues, Throat surgery,
Accident or surgery, Chikungunya, Dengue, COVID-19

Writing instruments consumed (soil, pencil) — current or past
Animal bites — Snake, Scorpion, Dog, Monkey

### Section F — Family History

Diseases: Blood pressure, Diabetes, Psoriasis, Asthma, Vision problems,
Heart disease, Cancer, and others

Paternal family (father, uncle, aunt, grandparents)
Maternal family (mother, maternal aunt, maternal grandparents)

---

## Module 4 — Patient History & Lifestyle Form

Based on Rognpatrak Page 2 from Mitram Ayurveda.

### Section A — Daily Routine

- Wake-up time
- Morning beverages: Tea, Coffee, Milk, Other — number of cups
- Exercise: Yes/No — if yes, details
- Home environment: Normal / Stressful / Doubtful / Angry / Jealous / Other
- Bathing time, hot water bath: beneficial or not
- Cold water: beneficial or not
- Work nature: Seated / Fieldwork / Intellectual / Mental stress / Hot / Shift duty
- Work timing, travel mode, distance per day
- Meal timing: regular or irregular
- Hunger patterns, eating triggers
- Distractions during eating: TV, reading, chatting, anger, worry
- Meal durations in minutes for breakfast, lunch, dinner

### Section B — Dietary Assessment Table

Monthly food intake table. For each item record quantity per month.

Categories and items:

- Grains: Bhakri (Jowar/Nachni/Bajra), Poli/Fulka, Rice, Sugar, Jaggery,
  Kheer/Shira, Fruits, Jam/Jelly, Salt, Cheese, Salty snacks, Farsan
- Vegetables & Greens: Spinach, Fenugreek, Chavakavat, Karadi, Naath
- Condiments: Cucumber, Tomato, Carrot, Radish, Beetroot, Curd, Buttermilk,
  Lemon, Garlic, Green chili, Onion, Clove, Red chili, Garam masala
- Pulses: Matki, Chhole, Harbhara, Mug
- Chutneys: Peanut, Sesame, Garlic, Mirchi
- Street food: Pav bhaji, Ragda patties, Bhel, Pani puri
- Non-vegetarian: Chicken, Mutton, Fish, Eggs, Shrimp
- Beverages: Milk, Tea, Coffee, Bournvita, Cold drinks
- Cooked/old food: Day-old rice, Bhakri, leftover items
- Fridge usage: Frozen food reheating, ice cream, stored cooked items
- Oils & Fats: Peanut oil, Sunflower, Refined, Coconut, Ghee, Butter
- Dairy combinations (Viruddha Anna): Shikran, Fruitsalad, Milkshake,
  Tea before/after meals
- Fasting foods: Sabudana, Bhagar, Ratale, Shingada
- Restaurant food: Punjabi, South Indian, Chinese — frequency
- Water intake: morning, before meals, during, after, total daily amount
- Bakery: Toast, Biscuits, Cake, Sandwich, Pizza, Burger, Bread

### Section C — Bowel Habits

- Frequency per day and timing
- Sensitivity before defecation (coffee/tea triggered)
- Stool form: Hard / Loose / Banana-like / Liquid
- Blood in stool: Yes/No
- Gas: Yes/No, Mucus: Yes/No
- Reading habit in toilet: Yes/No

### Section D — Urination

- Frequency: daytime and nighttime
- Color: White / Yellow / Dark yellow / Red
- Burning sensation: Yes/No
- Warmth: Yes/No

### Section E — Perspiration

- Sweating pattern: All year / Only summer / On exertion
- Amount: More / Equal / Less than normal
- Smell: More / Medium / None
- Clothing stains: Yes/No
- Excess sweating on palms or soles: Yes/No

### Section F — Menstrual History (Women only)

- Onset year, frequency: Regular / Irregular
- Duration in days, color, clots
- Pain: Heavy / Mild / None
- Other complaints before, during, after period

### Section G — Marital & Reproductive History

- Marital relations: Satisfactory / Unsatisfactory
- Family planning: Yes/No
- Children: number of boys and girls
- History of miscarriage or abortion

### Section H — Sleep

- Nighttime sleep hours
- Sleep quality: Deep / Irregular
- Re-sleeping after waking: Yes/No
- Daytime sleep: Yes/No
- Dreams: Frequent / Moderate / Rare
- Other issues: teeth grinding, talking in sleep, walking in sleep

### Section I — Eye & Screen Habits

- TV watching: hours per day or occasionally
- Reading habits

---

## Module 5 — Clinical Examination Form (Doctor Only)

Based on Rognpatrak Page 3 from Mitram Ayurveda.
This form is visible to Doctor and Assistant Doctor roles only.

### Section A — Psychological Assessment (Scale 1 to 5)

1. Major psychological trauma in 1 year before illness onset — Rate 5 4 3 2 1
2. Multiple years of stress, anxiety, fear before illness — Rate 5 4 3 2 1
3. Patient nature: calm / angry / anxious / greedy / careless / self-centred — Rate 5 4 3 2 1
4. Readiness to compromise own interests — Rate 5 4 3 2 1
5. Habit of comparing self to others (financial, social, family) — Yes/No with description

### Section B — Substance Use

Betel nut, Tobacco chew, Smokeless tobacco, Cigarettes, Paan masala,
Gutkha, Alcohol, Drug use — each with frequency

### Section C — Physical Examination

- Liver size and consistency (यकृत)
- Spleen palpation (प्लीहा)
- Navel area examination (नाभीआसमंत)
- Body diagram: front, back, left side, right side — for marking affected areas

### Section D — Systemic Examination

Other findings, Touch examination, Lung, Tongue, Heart, Pulse/Nadi,
Throat, Joints, Teeth, Ear, Nose (left/right), Back, Eyes, Skin/Complexion,
Nails, Weight

### Section E — Ayurvedic Diagnosis

- Treatment approach (चिकित्सातत्व)
- Dosha assessment — Vata / Pitta / Kapha
- Avastha — current condition state

---

## Module 6 — Prescription & Treatment Plan

### Medicine Fields (repeatable rows)

- Medicine name
- Dosage form: tablet / powder / decoction / oil / ghee / capsule / syrup
- Quantity per dose
- Frequency: times per day
- Timing: before meals / after meals / with meals / bedtime / empty stomach
- Duration in days
- Special instructions
- Link to inventory for auto stock deduction

### Treatment Prescribed

- External therapies: Abhyanga, Swedana, Basti, Nasya, Jalaukavacharan
- Panchakarma treatments (linked to Panchakarma module)
- Local applications: Lepa, Parishek, Kati basti, Shiro basti

### Diet Instructions

- Foods to eat (Pathya)
- Foods to avoid (Apathya)

### Lifestyle Instructions

- Exercise: type, duration, frequency
- Yoga and Pranayama recommendations
- Prohibited activities

### Precautions

- Condition-specific precautions
- Seasonal advice

### Follow-up

- Next appointment date
- Treatment course duration
- Return condition instructions

### Output

- Printable prescription with hospital letterhead
- PDF export with doctor signature space
- Full prescription history per patient

---

## Module 7 — Panchakarma Treatment Management

### Treatment Planning

- Procedure type: Vamana / Virechana / Basti / Nasya / Raktamokshana / Other
- Number of sessions, duration, schedule
- Pre-procedure preparation: Snehapana, Abhyanga, Swedana
- Duration of preparation phase in days
- Oils and medicines required (linked to inventory)
- Post-procedure care instructions

### Session Tracking (per session)

- Date, time, therapist name, duration
- Doctor observations for that session
- Patient vitals before and after
- Medicines and oils used (auto-deducted from inventory)
- Session completion status

### Output

- Full treatment course summary report
- Session-wise treatment log
- Before and after patient condition comparison
- Printable and PDF-exportable report
- Integration with billing for final invoice

---

## Module 8 — Token & Queue Management

### Token Generation

- Auto-generated sequential token on patient registration
- Linked to: patient name, doctor, date, registration time
- Each doctor has their own independent queue
- Printable token receipt for patient

### Waiting Area Display Screen

- Dedicated display (TV/monitor) showing current token being served
- Patient can see how many are ahead of them
- Estimated wait time based on average consultation time
- Display auto-refreshes every few seconds
- Token status: Waiting / In Consultation / Completed / Skipped

### Queue Controls

- Call next token
- Skip a token (re-queue or mark absent)
- Mark consultation complete
- Priority override for emergencies

---

## Module 9 — Billing & Invoice

### Bill Line Items

- Consultation fee
- Medicines dispensed (from inventory with unit price)
- Panchakarma sessions (per session or per course)
- External therapy charges
- Diagnostic charges
- Discount (percentage or fixed)
- GST if applicable
- Total payable

### Payment

- Mode: Cash / UPI / Card / Bank transfer / Insurance
- Partial payment and balance tracking
- Payment receipt generation
- Outstanding balance alert on next visit

### Output

- Printable bill with hospital letterhead and logo
- PDF export
- Bill history per patient
- Daily and monthly revenue summary for admin

---

## Module 10 — Inventory & Pharmacy

### Medicine Master

- Name (brand and generic)
- Category: Classical Ayurvedic / Proprietary / Panchakarma oil / Herb / Consumable
- Unit of measure: tablets / grams / ml / bottles / packets
- Selling price and purchase price
- Supplier details
- Expiry date

### Stock Management

- Opening stock entry
- Stock-in: purchase entry with quantity, date, supplier
- Stock-out: auto deduction when medicines issued via prescription or Panchakarma
- Manual stock adjustment for wastage or returns
- Current stock level per medicine per hospital

### Alerts

- Configurable minimum stock threshold per medicine per hospital
- Alert when stock falls below threshold
- Alert shows: medicine name, current quantity, reorder quantity, supplier
- Alerts visible on dashboard and optionally via notification
- Expiry alert: medicines expiring within 30 / 60 / 90 days (configurable)

---

## Module 11 — Reports & PDF Generation

### Patient Reports

- Complete patient history (all visits consolidated)
- Single visit consultation report
- Panchakarma full course report
- Discharge summary
- All as PDF with hospital branding

### Admin Reports

- Daily OPD count per doctor
- Revenue: daily / weekly / monthly / annual
- Inventory usage over a period
- Low stock report
- Expiry report
- Doctor-wise patient load

---

## Module 12 — Hospital Dashboard & Analytics

### Today's Summary (KPIs)

- Total patients today
- Patients: waiting / in consultation / completed
- Doctor-wise patient count
- Revenue collected today
- Active Panchakarma patients and sessions
- Low stock alert count
- Upcoming follow-ups

### Analytics Charts

- Patient growth trend: monthly and quarterly, new vs returning
- Most common complaints and conditions
- Revenue trend over time
- Doctor performance: average consultations per day
- Inventory turnover: most used medicines
- Panchakarma utilization: most performed procedures

---

## Module 13 — Multi-Hospital & Branch Architecture

### Hospital Setup

- Hospital registration: name, type, address, GSTIN, logo, contact
- Branch setup under parent hospital
- Doctor assignment to specific hospital or branch
- Independent form templates per hospital
- Independent pricing per hospital
- Independent inventory per hospital or branch

### Data Isolation Rules

- Patient records scoped to registered hospital or branch
- Inventory, billing, reports are per hospital
- Doctors can be shared across branches of same hospital
- Admin of one hospital cannot access another hospital's data
- Super Admin can access everything

---

## Critical Development Rules

1. Every form must use the Dynamic Form Engine — never hardcode any form
2. Forms are customizable per hospital — one hospital's changes never affect others
3. Inventory is separate per hospital and branch
4. Patient data is scoped to their registered hospital
5. All documents (prescriptions, bills, reports) must be printable and exportable as PDF
6. Every data change must be logged in an audit trail (user, timestamp, what changed)
7. Never break existing functionality when adding new features
8. Write clean, modular, reusable code with comments on complex logic
9. All monetary values stored in paise (smallest unit) not rupees
10. All dates stored in UTC, displayed in IST

---

## Future Scope (Out of Scope for v1.0)

- Patient portal: login, view history, download reports
- Online appointment booking with time slot selection
- Follow-up management with automated reminders
- AI health assistant chatbot for medication and diet queries
- Patient-facing token status on mobile
- Push notifications for appointments and reminders
- Offline mode with sync on reconnect

---

## Non-Functional Requirements

| Requirement       | Target                                          |
| ----------------- | ----------------------------------------------- |
| Page load time    | Under 2 seconds                                 |
| Report generation | Under 10 seconds                                |
| Uptime            | 99.5%                                           |
| Concurrent users  | 500 per hospital                                |
| Data backup       | Daily, retained 90 days                         |
| Restore time      | Within 4 hours                                  |
| Language support  | English and Marathi labels                      |
| Security          | Encrypted at rest and in transit                |
| Audit trail       | All data changes logged with user and timestamp |
| Print/Export      | All documents printable and PDF exportable      |
