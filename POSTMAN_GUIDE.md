# Ayurmedi API - Postman Testing Guide

## 📥 Importing the Collection

1. **Open Postman**

2. **Import Collection**
   - Click "Import" button (top left)
   - Select `Ayurmedi-API-Collection.postman_collection.json`
   - Click "Import"

3. **Set Collection Variables**
   - The collection has these variables pre-configured:
     - `baseUrl`: `https://m6y68bub70.execute-api.ap-south-1.amazonaws.com`
     - `authToken`: (automatically set after login)

---

## 🚀 Quick Start - Testing the APIs

### Step 1: Login First
**IMPORTANT**: Always run the login request first to get your authentication token!

1. Go to **Authentication → Login - Super Admin**
2. Click "Send"
3. ✅ Token is automatically saved to `authToken` variable
4. You can now call all other APIs

**Credentials:**
```
Email: admin@ayurmedi.com
Password: Admin@2026
```

---

### Step 2: Test Medicine APIs

#### 1. **List All Medicines**
- **Request**: GET `/medicines/list`
- **Auth**: Automatic (uses saved token)
- **Returns**: 31 Ayurvedic medicines

#### 2. **Search Medicines**
- **Request**: GET `/medicines/search?query=त्रिफला`
- **Query Params**:
  - `query`: त्रिफला (or any search term)
  - Accepts Marathi or English

#### 3. **Create Medicine**
- **Request**: POST `/medicines/create`
- **Body**:
```json
{
  "name_mr": "अश्वगंधारिष्ट",
  "name_en": "Ashwagandharishta",
  "medicine_type": "arishta",
  "price": 250,
  "description": "Immunity booster"
}
```

**Medicine Types:**
- `kashay` - कषाय (Decoctions)
- `tail` - तैल (Oils)
- `churna` - चूर्ण (Powders)
- `vati` - वटी (Tablets)
- `avaleha` - अवलेह (Jams)
- `arishta` - अरिष्ट (Fermented drinks)

---

### Step 3: Test Dropdown APIs

#### 1. **List Dropdown Categories**
- **Request**: GET `/dropdowns/list?lang=en`
- **Query Params**:
  - `lang`: `en` (English) or `mr` (Marathi)
- **Returns**: 8 dropdown categories

#### 2. **Get Dropdown Options**
- **Request**: GET `/dropdowns/purvrut/options?lang=en`
- **Path Param**: Replace `purvrut` with any dropdown code:
  - `purvrut` - Medical History (पूर्वऋतु)
  - `artava` - Menstruation (आर्तव)
  - etc.

---

## 📊 All Available Endpoints

### ✅ Working Endpoints (5)

| Category | Method | Endpoint | Status |
|----------|--------|----------|--------|
| **Auth** | POST | `/auth/login` | ✅ 200 |
| **Auth** | POST | `/auth/logout` | ✅ |
| **Medicine** | GET | `/medicines/list` | ✅ 200 |
| **Medicine** | GET | `/medicines/search` | ✅ 200 |
| **Medicine** | POST | `/medicines/create` | ✅ 200 |
| **Dropdown** | GET | `/dropdowns/list` | ✅ 200 |
| **Dropdown** | GET | `/dropdowns/{code}/options` | ✅ 200 |
| **Hospital** | POST | `/hospital/register` | ✅ 200 |

---

## 🔑 Authentication

All endpoints (except login/logout) require authentication.

**How it works:**
1. The collection uses **Bearer Token** authentication
2. After successful login, token is saved to `{{authToken}}`
3. All subsequent requests automatically include:
   ```
   Authorization: Bearer {{authToken}}
   ```

**Manual Token Testing:**
If you want to test with a specific token:
1. Go to **Collection → Variables**
2. Update `authToken` value
3. Save changes

---

## 🧪 Testing Scenarios

### Scenario 1: Search for Marathi Medicine
```
GET /medicines/search?query=त्रिफला

Expected: Returns all medicines with "त्रिफला" in name
```

### Scenario 2: Search for English Medicine
```
GET /medicines/search?query=Triphala

Expected: Returns all medicines with "Triphala" in name
```

### Scenario 3: Create Custom Medicine
```
POST /medicines/create

Body:
{
  "name_mr": "महासुदर्शन कषाय",
  "name_en": "Mahasudarshan Kashay",
  "medicine_type": "kashay",
  "price": 180
}

Expected: Returns created medicine with medicine_id
```

### Scenario 4: Get Dropdown in Marathi
```
GET /dropdowns/list?lang=mr

Expected: All labels in Marathi (मराठी)
```

### Scenario 5: Get Dropdown Options
```
GET /dropdowns/purvrut/options?lang=en

Expected: Returns medical history options:
- Diabetes
- Hypertension
- Heart Disease
- Thyroid Disorder
```

---

## 📝 Example Responses

### Medicine List Response
```json
{
  "success": true,
  "data": {
    "medicines": [
      {
        "medicine_id": "abc-123",
        "hospital_id": "GLOBAL",
        "name_mr": "त्रिफला कषाय",
        "name_en": "Triphala Kashay",
        "medicine_type": "kashay",
        "price": 150,
        "is_active": true,
        "created_at": "2026-02-08T15:00:00.000Z"
      }
    ]
  }
}
```

### Dropdown Categories Response
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "dropdown_id": "xyz-456",
        "dropdown_code": "purvrut",
        "label": "Medical History",
        "section_name": "History",
        "input_type": "select",
        "sort_order": 1
      }
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
**Solution**: Run the login request first to get a fresh token

### Issue: "Token expired"
**Solution**: Login again - tokens expire after some time

### Issue: "Validation error"
**Solution**: Check required fields in request body:
- Medicine: `name_mr` and `medicine_type` are required
- Dropdown options: Valid `dropdown_code` in URL path

### Issue: Empty response
**Solution**: 
- Check if you're logged in
- Verify the endpoint URL is correct
- Check query parameters are properly formatted

---

## 💡 Tips

1. **Use Environments** (Optional)
   - Create separate environments for dev/staging/prod
   - Each can have different `baseUrl` and `authToken`

2. **Save Example Responses**
   - After testing, save successful responses as examples
   - Helps with documentation

3. **Use Tests Tab**
   - The login request auto-saves token using Tests script
   - You can add more test scripts for validation

4. **Check Console**
   - Postman Console shows all request/response details
   - Helpful for debugging

---

## 📌 Quick Reference

**Base URL**: `https://m6y68bub70.execute-api.ap-south-1.amazonaws.com`

**Test Credentials**:
- Email: `admin@ayurmedi.com`
- Password: `Admin@2026`

**Sample Search Terms**:
- त्रिफला (Triphala)
- अश्वगंधा (Ashwagandha)
- शतावरी (Shatavari)

**Dropdown Codes**:
- `purvrut` - Medical History
- `artava` - Menstruation
- (6 more available via list endpoint)

---

**Last Updated**: 2026-02-08  
**API Version**: v1  
**Status**: All endpoints tested and verified ✅
