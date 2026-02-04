# AWS Deployment Guide

## Prerequisites

1. **AWS CLI configured** with your credentials
   ```bash
   aws configure
   ```

2. **Node.js 20+** installed
3. **Serverless Framework** (installing now)

## Deployment Steps

### 1. Install Serverless Framework
```bash
npm install -D serverless
```

### 2. Configure AWS Credentials
Make sure your AWS CLI is configured:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: ap-south-1
```

### 3. Deploy to AWS
```bash
npx serverless deploy
```

This will:
- ✅ Create Lambda functions for all endpoints
- ✅ Set up API Gateway with HTTP API
- ✅ Create DynamoDB tables (Users & Hospitals)
- ✅ Configure IAM roles and permissions
- ✅ Output your API Gateway URL

### 4. Get Your API URL

After deployment, you'll see:
```
endpoints:
  POST - https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/auth/login
  POST - https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/auth/logout
  ...
```

Copy the base URL: `https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com`

### 5. Update Postman Collection

Update the `baseUrl` in `apicollection.json`:
```json
{
  "key": "baseUrl",
  "value": "https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com"
}
```

### 6. Bootstrap Super Admin (if needed)

If deploying fresh DynamoDB tables:
```bash
npm run bootstrap-super-admin
```

### 7. Test in Postman

Import the updated collection and test all endpoints!

## Deployment Commands

```bash
# Deploy to dev (default)
npx serverless deploy

# Deploy to production
npx serverless deploy --stage prod

# Deploy single function (faster)
npx serverless deploy function -f authLogin

# View deployment info
npx serverless info

# View logs
npx serverless logs -f authLogin --tail

# Remove deployment
npx serverless remove
```

## Environment Variables

Ensure `.env` has:
```
AWS_REGION=ap-south-1
USER_POOL_ID=your-pool-id
USER_POOL_CLIENT_ID=your-client-id
SUPER_ADMIN_EMAIL=admin@ayurmedi.com
SUPER_ADMIN_PASSWORD=Admin@2026
```

## Cost Estimate

With AWS Free Tier:
- **Lambda**: 1M requests/month free
- **DynamoDB**: 25GB storage + 25 WCU/RCU free
- **API Gateway**: 1M requests/month free (HTTP API)

Expected monthly cost: **$0-5** for development

## Troubleshooting

### Deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Ensure Cognito User Pool exists
- Verify region in `.env` matches AWS setup

### API returns errors
- Check CloudWatch logs: `npx serverless logs -f authLogin`
- Verify environment variables in Lambda console
- Ensure DynamoDB tables were created

### Tables already exist
If you get "Table already exists" error:
- Use existing tables by updating `serverless.yml`
- Or remove old tables first (backup data!)

## Next Steps

After successful deployment:
1. ✅ Update Postman baseUrl
2. ✅ Test all endpoints
3. ✅ Set up monitoring (CloudWatch)
4. ✅ Configure custom domain (optional)
5. ✅ Set up CI/CD pipeline (optional)
