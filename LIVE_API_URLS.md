# STEP 3 — LIVE API URLS

## 🌐 DEPLOYMENT INFO
- **API Gateway Base URL**: `https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com`
- **AWS Region**: ap-south-1
- **Stage**: dev
- **Total Lambdas deployed**: 59 ✅

---

## 📋 ALL LIVE API ENDPOINTS

### 🔐 Authentication
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/auth/login
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/auth/logout
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/auth/forgot-password
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/auth/reset-password
```

### 🏥 Hospital Management
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/hospitals/register
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/hospitals/{id}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/hospitals
```

### 🏢 Branches
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/hospitals/{hospitalId}/branches
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/hospitals/{hospitalId}/branches
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/branches/{id}
```

### 👥 Users
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/users
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/users
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/users/{id}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/users/{id}
DELETE https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/users/{id}
```

### 📋 Patient Registration
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{id}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{id}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/search
```

### 📝 Dynamic Forms
```
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/forms/config/{formType}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/forms/config/{formType}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/forms/config
```

### 🩺 Consultations
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/consultations
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/consultations/{id}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/consultations/{id}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{patientId}/consultations
```

### 📋 Prescriptions
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/prescriptions
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/prescriptions/{id}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{patientId}/prescriptions
```

### 🌿 Panchakarma
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/panchakarma/plans
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/panchakarma/plans/{id}
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{patientId}/panchakarma
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/panchakarma/plans/{id}/sessions
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/panchakarma/plans/{id}/sessions
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/panchakarma/sessions/{sessionId}
```

### 🎫 Token & Queue
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/tokens
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/tokens/queue
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/tokens/{id}/status
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/tokens/display
```

### 💰 Billing
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/billing
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/billing/{id}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/billing/{id}/payment
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{patientId}/bills
```

### 💊 Inventory
```
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/items
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/items
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/items/{id}
PUT    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/items/{id}
POST   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/stock-in
PUT   https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/stock-adjust
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/alerts/low-stock
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/inventory/alerts/expiry
```

### 📊 Reports
```
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/reports/daily-opd
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/reports/revenue
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/reports/inventory-usage
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/reports/low-stock
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/patients/{patientId}/report
```

### 📈 Dashboard
```
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/dashboard/summary
GET    https://zxtnpc9yhe.execute-api.ap-south-1.amazonaws.com/dashboard/analytics
```

---

## 📊 SUMMARY
- **Total API Endpoints**: 59 ✅
- **All Lambdas Deployed**: 59/59 ✅
- **API Gateway**: Active ✅
- **CORS**: Configured ✅
- **Authentication**: Ready ✅

**Ready for STEP 4 — Live API Testing** 🚀
