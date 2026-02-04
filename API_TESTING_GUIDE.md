# API Testing Guide

Complete guide to test all Ayurmedi Backend APIs using Postman or any API client.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Testing Workflow](#testing-workflow)
- [Available Endpoints](#available-endpoints)
- [Common Issues](#common-issues)

## Prerequisites

1. **Postman** (or any API client like Thunder Client, Insomnia, etc.)
2. **Super Admin Created**: Run the bootstrap script first
   ```bash
   npm run bootstrap-super-admin
   ```
3. **API Deployed**: Ensure your API is deployed to AWS (API Gateway + Lambda)

## Setup

### 1. Import API Collection

Import `apicollection.json` into Postman:
- Open Postman
- Click **Import**
- Select `apicollection.json` file
- Collection will be imported with all endpoints

### 2. Configure Environment

Set the `baseUrl` variable in the collection:
- Click on the collection
- Go to **Variables** tab
- Update `baseUrl` with your API Gateway URL

Example:
```
baseUrl = https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com
```

> **Note**: If you haven't deployed yet, you'll need to deploy the Lambda functions and API Gateway first.

## Testing Workflow

### Phase 1: Super Admin Login

1. **Login as Super Admin**
   - Endpoint: `POST /auth/login`
   - Credentials:
     ```json
     {
       "email": "admin@ayurmedi.com",
       "password": "Admin@2026"
     }
     ```
   - ✅ Success: Token automatically saved to `{{superAdminToken}}`

### Phase 2: Register Hospital

2. **Register a Hospital**
   - Endpoint: `POST /hospital/register`
   - Requires: Super Admin Token (Authorization header)
   - Body:
     ```json
     {
       "hospital_code": "HOSP001",
       "name": "City General Hospital",
       "admin_email": "admin@hospital1.com",
       "admin_password": "HospitalAdmin@123",
       "admin_full_name": "Jane Smith",
       "admin_mobile": "+919876543210"
     }
     ```
   - ✅ Success: Hospital created with admin user

### Phase 3: Hospital Admin Login

3. **Login as Hospital Admin**
   - Endpoint: `POST /auth/login`
   - Credentials (from previous step):
     ```json
     {
       "email": "admin@hospital1.com",
       "password": "HospitalAdmin@123"
     }
     ```
   - ✅ Success: Token automatically saved to `{{hospitalAdminToken}}`

### Phase 4: Create Users

4. **Create Doctor**
   - Endpoint: `POST /user/create`
   - Requires: Hospital Admin Token
   - Body:
     ```json
     {
       "full_name": "Dr. Sarah Connor",
       "email": "doctor1@hospital1.com",
       "mobile": "+919876543211",
       "role": "DOCTOR",
       "password": "Doctor@123"
     }
     ```

5. **Create Reception**
   - Same endpoint, change role to `RECEPTION`

6. **Create Assistant**
   - Same endpoint, change role to `ASSISTANT`

### Phase 5: User Login

7. **Login as Doctor/Reception/Assistant**
   - Use the created user credentials
   - Token saved to `{{doctorToken}}` (for doctor)

## Available Endpoints

### Authentication Endpoints

| Endpoint | Method | Auth Required | Role | Description |
|----------|--------|---------------|------|-------------|
| `/auth/login` | POST | No | Any | Login user |
| `/auth/logout` | POST | Yes | Any | Logout user |
| `/auth/forgot-password` | POST | No | Any | Request password reset |
| `/auth/reset-password` | POST | No | Any | Reset password with code |

### Hospital Management

| Endpoint | Method | Auth Required | Role | Description |
|----------|--------|---------------|------|-------------|
| `/hospital/register` | POST | Yes | SUPER_ADMIN | Register new hospital |

### User Management

| Endpoint | Method | Auth Required | Role | Description |
|----------|--------|---------------|------|-------------|
| `/user/create` | POST | Yes | HOSPITAL_ADMIN | Create hospital user |

## Common Issues

### Issue 1: "Authorization header missing"

**Problem**: Forgot to include Bearer token in Authorization header

**Solution**: 
- Ensure you've logged in first
- Token is automatically saved in collection variables
- Authorization header should be: `Bearer {{superAdminToken}}`

### Issue 2: "User not found or inactive"

**Problem**: User doesn't exist in DynamoDB or has INACTIVE status

**Solution**:
- For Super Admin: Run bootstrap script again
- For Hospital Admin: Check if hospital registration succeeded
- For other users: Check if user creation succeeded

### Issue 3: "Invalid email or password"

**Problem**: Wrong credentials or user doesn't exist in Cognito

**Solution**:
- Verify email and password in `.env` file
- Ensure bootstrap/registration script completed successfully
- Check Cognito User Pool in AWS Console

### Issue 4: Connection refused / Cannot connect

**Problem**: API Gateway not deployed or wrong URL

**Solution**:
- Deploy your Lambda functions and API Gateway
- Update `baseUrl` in collection variables
- Test with a simple curl command first

### Issue 5: "Route not found"

**Problem**: Endpoint path is incorrect

**Solution**:
- Check that your router.js has all routes configured
- Verify API Gateway routes match the handler routes
- Check Lambda function deployment

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": "Additional details"
  }
}
```

## User Roles Hierarchy

```
SUPER_ADMIN
├── Can register hospitals
├── Full system access
└── Created via bootstrap script

HOSPITAL_ADMIN
├── Can create hospital users (Doctor, Reception, Assistant)
├── Hospital-scoped access
└── Created during hospital registration

DOCTOR / RECEPTION / ASSISTANT
├── Hospital staff users
├── Limited to their hospital
└── Created by Hospital Admin
```

## Testing Tips

1. **Use Collection Runner**: Test entire workflow automatically
2. **Save Tokens**: Tokens are auto-saved by test scripts in each request
3. **Check Logs**: Use CloudWatch logs for debugging Lambda errors
4. **Test Locally**: Consider setting up local Lambda testing with SAM or Serverless Offline
5. **Environment Variables**: Create separate Postman environments for dev/staging/prod

## Next Steps

After testing all APIs:
1. Deploy to production environment
2. Set up monitoring and alerting
3. Configure rate limiting
4. Add API key authentication for additional security
5. Implement refresh token rotation

---

**Need Help?** Check the main README.md or contact the development team.
