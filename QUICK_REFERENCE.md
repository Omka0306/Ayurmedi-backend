# Quick Reference - Ayurmedi Backend APIs

> **Quick access guide for testing and development**

## 🚀 Quick Start

```bash
# 1. Create Super Admin
npm run bootstrap-super-admin

# 2. Test Login
npm run test-login

# 3. Run System Diagnostics
npm run diagnose
```

## 🔑 Default Credentials

### Super Admin
```
Email: admin@ayurmedi.com
Password: Admin@2026
```

## 📡 API Endpoints Summary

| Endpoint | Method | Auth | Role | Description |
|----------|--------|------|------|-------------|
| `/auth/login` | POST | ❌ | Any | Login user |
| `/auth/logout` | POST | ✅ | Any | Logout user |
| `/auth/forgot-password` | POST | ❌ | Any | Request password reset |
| `/auth/reset-password` | POST | ❌ | Any | Reset password |
| `/hospital/register` | POST | ✅ | SUPER_ADMIN | Register hospital |
| `/user/create` | POST | ✅ | HOSPITAL_ADMIN | Create user |

## 📝 Request Examples

### 1. Login
```bash
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ayurmedi.com",
    "password": "Admin@2026"
  }'
```

### 2. Register Hospital
```bash
curl -X POST https://your-api.com/hospital/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "hospital_code": "HOSP001",
    "name": "City Hospital",
    "admin_email": "admin@hospital1.com",
    "admin_password": "HospitalAdmin@123",
    "admin_full_name": "Jane Smith"
  }'
```

### 3. Create User
```bash
curl -X POST https://your-api.com/user/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HOSPITAL_ADMIN_TOKEN" \
  -d '{
    "full_name": "Dr. John Doe",
    "email": "doctor1@hospital1.com",
    "mobile": "+919876543210",
    "role": "DOCTOR",
    "password": "Doctor@123"
  }'
```

## 🎭 User Roles

| Role | Can Do | Created By |
|------|--------|------------|
| **SUPER_ADMIN** | Register hospitals | Bootstrap script |
| **HOSPITAL_ADMIN** | Create hospital users | Hospital registration |
| **DOCTOR** | Hospital operations | Hospital admin |
| **RECEPTION** | Front desk operations | Hospital admin |
| **ASSISTANT** | Support operations | Hospital admin |

## ✅ Response Format

### Success
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": "Additional info"
  }
}
```

## 🔧 Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 204 | No Content (success, no data) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth failed) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

## 🐛 Troubleshooting

### Login fails
- ✅ Check credentials in `.env`
- ✅ Run `npm run bootstrap-super-admin`
- ✅ Verify Cognito User Pool ID

### Token expired
- ✅ Token expires in 60 minutes
- ✅ Login again to get new token
- ✅ Use refresh token (future feature)

### User not found
- ✅ Check DynamoDB table exists
- ✅ Run `npm run diagnose`
- ✅ Verify Cognito user exists

## 📚 Full Documentation

- **[API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)** - Complete testing guide
- **[apicollection.json](./apicollection.json)** - Postman collection
- **[README.md](./README.md)** - Project overview

## 🔗 Useful Links

- AWS Cognito User Pools: `ap-south-1_FpfBvDeLM`
- DynamoDB Tables:
  - Users: `ayurmedi-backend-users-dev`
  - Hospitals: `ayurmedi-backend-hospitals-dev`

---

**Pro Tip**: Import `apicollection.json` into Postman for automatic token management and pre-configured requests!
