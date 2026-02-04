# Ayurmedi Backend - Phase 1

> Healthcare Management SaaS Platform - Authentication & Hospital Setup Module

A scalable, secure backend system for Ayurmedi healthcare management platform built with AWS Serverless architecture.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Update .env with your AWS credentials

# 3. Create Super Admin
npm run bootstrap-super-admin

# 4. Test the system
npm run test-login
npm run diagnose
```

## 📋 Project Overview

This is **Phase 1** of the Ayurmedi backend, focusing on:
- ✅ User Authentication (AWS Cognito)
- ✅ Hospital Registration & Management
- ✅ User Management (Roles: Super Admin, Hospital Admin, Doctor, Reception, Assistant)
- ✅ Secure API with JWT tokens
- ✅ Multi-tenant architecture

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Lambda  │ (Router)
    └────┬─────┘
         │
    ┌────▼────────────────────────────┐
    │  Handlers Layer                 │
    │  ├─ auth.handler.js             │
    │  ├─ hospital.handler.js         │
    │  └─ user.handler.js             │
    └────┬────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  Workflows Layer                │
    │  (Business Logic)               │
    └────┬────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  Services Layer                 │
    │  ├─ cognito.service.js          │
    │  └─ hospital.service.js         │
    └────┬────────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │  Persistence Layer              │
    │  (DynamoDB Repositories)        │
    └────┬────────────────────────────┘
         │
    ┌────▼──────┬──────────┐
    │  Cognito  │ DynamoDB │
    └───────────┴──────────┘
```

## 📁 Project Structure

```
Ayurmedi-backend/
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── router.js       # Main route handler
│   │   ├── auth.handler.js
│   │   ├── hospital.handler.js
│   │   └── user.handler.js
│   ├── workflows/          # Business logic orchestration
│   │   ├── auth.workflow.js
│   │   ├── hospital.workflow.js
│   │   └── user.workflow.js
│   ├── services/           # External service integrations
│   │   ├── cognito.service.js
│   │   └── hospital.service.js
│   ├── persistence/        # Data layer (DynamoDB)
│   │   ├── dynamodb.client.js
│   │   ├── hospital.repo.js
│   │   └── user.repo.js
│   ├── middlewares/        # Auth & validation
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   ├── utils/              # Utilities
│   │   ├── error.util.js
│   │   ├── logger.util.js
│   │   └── response.util.js
│   ├── constants/          # Configuration
│   │   └── config.js
│   └── infrastructure/     # Setup scripts
│       ├── bootstrap-super-admin.js
│       ├── test-login.js
│       └── diagnose-system.js
├── .env                    # Environment variables
├── .env.example            # Environment template
├── package.json
├── apicollection.json      # Postman collection
├── API_TESTING_GUIDE.md    # Complete API testing guide
├── QUICK_REFERENCE.md      # Quick reference guide
└── README.md              # This file
```

## 🔐 Security Features

- ✅ JWT-based authentication (AWS Cognito)
- ✅ Role-based access control (RBAC)
- ✅ Password complexity requirements
- ✅ Secure password storage (Cognito)
- ✅ Multi-tenant data isolation
- ✅ Token expiration (60 minutes)

## 👥 User Roles & Permissions

| Role | Permissions | Created By |
|------|-------------|------------|
| **SUPER_ADMIN** | • Register hospitals<br>• Full system access | Bootstrap script |
| **HOSPITAL_ADMIN** | • Create users<br>• Manage hospital | Hospital registration |
| **DOCTOR** | • Access patient records<br>• Medical operations | Hospital Admin |
| **RECEPTION** | • Patient check-in<br>• Appointments | Hospital Admin |
| **ASSISTANT** | • Support tasks<br>• Basic operations | Hospital Admin |

## 🛠️ Available Scripts

```bash
# Bootstrap super admin (one-time setup)
npm run bootstrap-super-admin

# Test login functionality
npm run test-login

# Run system diagnostics
npm run diagnose
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with code

### Hospital Management (SUPER_ADMIN only)
- `POST /hospital/register` - Register new hospital with admin

### User Management (HOSPITAL_ADMIN only)
- `POST /user/create` - Create hospital users (Doctor, Reception, Assistant)

**📚 Full API Documentation**: See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)

**🎯 Quick Reference**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

## 📦 AWS Resources

### Required Services
- **AWS Cognito**: User authentication & authorization
- **AWS DynamoDB**: Data storage
- **AWS Lambda**: Serverless functions
- **AWS API Gateway**: API endpoints

### DynamoDB Tables
- `ayurmedi-backend-users-dev` - User profiles
- `ayurmedi-backend-hospitals-dev` - Hospital records

### Cognito User Pool
- Pool ID: `ap-south-1_FpfBvDeLM`
- Client ID: `5kqipnft7df3hv24flc0jt7re3`
- Region: `ap-south-1`

## 🧪 Testing

### Import Postman Collection
1. Open Postman
2. Import `apicollection.json`
3. Set `baseUrl` variable to your API Gateway URL
4. Start testing!

### Test Workflow
1. **Login as Super Admin** → Get token
2. **Register Hospital** → Creates hospital + admin
3. **Login as Hospital Admin** → Get token
4. **Create Users** → Create doctors, reception, etc.
5. **Login as User** → Test user access

**Complete Testing Guide**: [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# AWS Configuration
AWS_REGION=ap-south-1

# Cognito
USER_POOL_ID=ap-south-1_FpfBvDeLM
USER_POOL_CLIENT_ID=5kqipnft7df3hv24flc0jt7re3

# Super Admin (for bootstrap)
SUPER_ADMIN_EMAIL=admin@ayurmedi.com
SUPER_ADMIN_PASSWORD=Admin@2026
SUPER_ADMIN_NAME="Ayurmedi Super Admin"

# Application
STAGE=dev
LOG_LEVEL=INFO
```

## 🚦 Getting Started Guide

### Step 1: Setup Environment
```bash
# Clone repository
git clone <repository-url>
cd Ayurmedi-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AWS credentials
```

### Step 2: Create Super Admin
```bash
npm run bootstrap-super-admin
```

### Step 3: Deploy to AWS
```bash
# Deploy using Serverless Framework, SAM, or CDK
# (Deployment configuration to be added)
```

### Step 4: Test APIs
```bash
# Update baseUrl in apicollection.json with your API Gateway URL
# Import collection to Postman
# Follow API_TESTING_GUIDE.md
```

## 📊 Database Schema

### Users Table
```
Partition Key: user_id (String)
GSI: cognito_user_id-index

Attributes:
- user_id: UUID
- cognito_user_id: String
- hospital_id: String
- branch_id: String
- full_name: String
- email: String
- mobile: String
- role: String
- status: String (ACTIVE/INACTIVE)
- created_at: ISO8601
- updated_at: ISO8601
```

### Hospitals Table
```
Partition Key: hospital_id (String)
GSI: hospital_code-index

Attributes:
- hospital_id: UUID
- hospital_code: String (unique)
- name: String
- registration_no: String
- type: String
- owner_name: String
- email: String
- website: String
- subscription_plan: String
- subscription_start: ISO8601
- subscription_end: ISO8601
- status: String (ACTIVE/INACTIVE)
- created_at: ISO8601
- updated_at: ISO8601
```

## 🐛 Troubleshooting

### Common Issues

**Login fails**
- Verify super admin was created: `npm run diagnose`
- Check credentials in `.env`
- Ensure Cognito User Pool ID is correct

**API not accessible**
- Verify Lambda functions are deployed
- Check API Gateway configuration
- Ensure correct `baseUrl` in Postman

**User not found in DynamoDB**
- Check DynamoDB tables exist
- Verify GSI (Global Secondary Index) is created
- Run `npm run diagnose` to check system status

### Debug Commands
```bash
# Check system status
npm run diagnose

# Test login flow
npm run test-login

# View CloudWatch logs
# (Use AWS Console or AWS CLI)
```

## 📝 Development Workflow

1. **Feature Development**: Create handlers → workflows → services → repos
2. **Testing**: Use local testing scripts first
3. **Deployment**: Deploy to AWS dev environment
4. **API Testing**: Test with Postman collection
5. **Review**: Check CloudWatch logs for errors
6. **Production**: Deploy to production environment

## 🔮 Roadmap

### Phase 2 (Upcoming)
- [ ] Patient Management
- [ ] Appointment Scheduling
- [ ] Doctor Availability Management
- [ ] Medical Records

### Phase 3 (Future)
- [ ] Billing & Invoicing
- [ ] Inventory Management
- [ ] Reports & Analytics
- [ ] Mobile App Integration

## 📚 Documentation

- **[API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)** - Complete API testing guide
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference for developers
- **[apicollection.json](./apicollection.json)** - Postman collection

## 🤝 Contributing

1. Follow the existing code structure
2. Write clean, documented code
3. Test thoroughly before committing
4. Update documentation as needed

## 📄 License

Proprietary - Ayurmedi Healthcare Management System

---

**Version**: 1.0.0 - Phase 1  
**Last Updated**: February 4, 2026  
**Status**: Active Development

**Need Help?** Check the documentation or contact the development team.
