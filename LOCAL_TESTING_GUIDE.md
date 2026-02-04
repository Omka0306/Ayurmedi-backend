# 🔧 Testing with Local Server

## Problem Solved! ✅

The Postman collection now works with a **local development server** instead of requiring AWS deployment.

## How to Test

### Step 1: Start Local Server
```bash
npm run dev
```

You should see:
```
🚀 ========================================
   Ayurmedi Backend - Local Test Server
   ========================================

   Server running at: http://localhost:3000
```

### Step 2: Import Postman Collection
1. Open Postman
2. **Import** → Select `apicollection.json`
3. The collection is already configured with `baseUrl = http://localhost:3000`

### Step 3: Test Login
1. In Postman, open **"Authentication"** folder
2. Select **"Login - Super Admin"**
3. Click **Send**

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJraWQ...",
    "idToken": "eyJraWQ...",
    "refreshToken": "eyJjdHk...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

✅ The token is **automatically saved** to `{{superAdminToken}}`!

### Step 4: Test Protected Endpoints

Now that you're logged in, test:
- **Register Hospital** (uses `{{superAdminToken}}`)
- **Create Users** (after logging in as Hospital Admin)

## Common Errors & Solutions

### Error: "Cannot connect to localhost:3000"
**Solution**: Make sure the dev server is running (`npm run dev`)

### Error: "Authorization header missing"
**Solution**: Run the Login request first to get a token

### Error: "Invalid email or password"
**Solution**: 
- Verify credentials in `.env` match what you're using
- Run `npm run bootstrap-super-admin` if super admin doesn't exist

## Testing Workflow

```
Terminal 1:              Terminal 2/Postman:
-----------              -------------------
npm run dev        →     Test APIs in Postman
(keep running)     →     http://localhost:3000
```

## Complete Test Sequence

1. **Login as Super Admin**
   - Email: `admin@ayurmedi.com`
   - Password: `Admin@2026`
   - ✅ Token auto-saved

2. **Register Hospital**
   - Uses Super Admin token
   - Creates hospital + hospital admin
   - ✅ Hospital ID auto-saved

3. **Login as Hospital Admin**
   - Use credentials from Step 2
   - ✅ Hospital Admin token auto-saved

4. **Create Doctor**
   - Uses Hospital Admin token
   - Creates doctor user

5. **Login as Doctor**
   - Use credentials from Step 4
   - ✅ Doctor token auto-saved

## Tips

- 💡 Keep the server running in one terminal
- 💡 Use Postman in another window
- 💡 Check server logs for request details
- 💡 Tokens expire in 60 minutes

## When to Deploy to AWS

The local server is great for:
- ✅ Development and testing
- ✅ Quick iterations
- ✅ Debugging

Deploy to AWS when you need:
- Production environment
- Public API access
- Scalability
- AWS integrations

## Deployment (Future)

When ready to deploy:
1. Update `baseUrl` in Postman to your API Gateway URL
2. Deploy using Serverless Framework, SAM, or CDK
3. Test with the same Postman collection!

---

**Now your Postman collection should work perfectly! 🎉**

Server is running at: **http://localhost:3000**
