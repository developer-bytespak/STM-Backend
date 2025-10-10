# Homepage Search API - Implementation & Testing Guide

## 🎯 Overview

The Homepage Search API provides 4 endpoints for the hierarchical search flow:
1. **Service Search** - Autocomplete for services/categories
2. **Category Services** - Get services under a category
3. **Location Search** - Autocomplete for ZIP codes
4. **Provider Search** - Find providers by service + location

---

## 📁 Files Created

```
STM-Backend/src/modules/homepage/
├── homepage.module.ts              ✅ Created
├── homepage.controller.ts          ✅ Created
├── homepage.service.ts             ✅ Created
├── dto/
│   └── search-providers.dto.ts     ✅ Created
└── HOMEPAGE_API_TESTING_GUIDE.md   ✅ This file

STM-Backend/src/app.module.ts       ✅ Updated (HomepageModule registered)
```

---

## 🚀 Setup & Running

### 1. Install Dependencies (if needed)
```bash
cd STM-Backend
npm install
```

### 2. Seed Services Data
```bash
npx ts-node prisma/seed-services.ts
```

**Expected output:**
```
📁 Category: Interior Cleaning
   ✅ House Cleaning (ID: 1)
   ✅ Office Cleaning (ID: 2)

📁 Category: Engineer
   ✅ Engineer (standalone service - ID: 3)

...

🎉 SEEDING COMPLETE!
📊 Summary:
   ✅ Created: 65 services
   🔹 Standalone services: 15
   🔸 Categories with sub-services: 28
```

### 3. Start the Server
```bash
npm run start:dev
```

**Server should start on:** `http://localhost:8000`

---

## 📡 API Endpoints

### Base URL
```
http://localhost:8000/api/homepage/search
```

### Endpoints Summary
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/services` | Search services/categories |
| GET | `/services/category/:category` | Get category services |
| GET | `/locations` | Search locations (ZIP) |
| POST | `/providers` | Find providers |

---

## 🧪 API Testing with Postman

### 1️⃣ Service Search

**Endpoint:** `GET /api/homepage/search/services`

**Purpose:** Search for categories and services (autocomplete)

#### Test Case 1: Search "clean"
```http
GET http://localhost:8000/api/homepage/search/services?query=clean
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "category",
      "category": "Interior Cleaning",
      "id": 1,
      "description": "Professional interior cleaning services"
    },
    {
      "type": "category",
      "category": "Exterior Cleaning",
      "id": 2,
      "description": "Professional exterior cleaning services"
    },
    {
      "type": "service",
      "category": "Interior Cleaning",
      "name": "House Cleaning",
      "id": 10,
      "description": "Professional house cleaning service in the Interior Cleaning category"
    },
    {
      "type": "service",
      "category": "Interior Cleaning",
      "name": "Office Cleaning",
      "id": 11,
      "description": "Professional office cleaning service in the Interior Cleaning category"
    },
    {
      "type": "service",
      "category": "Exterior Cleaning",
      "name": "Gutter Cleaning",
      "id": 20,
      "description": "Professional gutter cleaning service in the Exterior Cleaning category"
    }
  ]
}
```

#### Test Case 2: Search "engineer"
```http
GET http://localhost:8000/api/homepage/search/services?query=eng
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "category",
      "category": "Engineer",
      "id": 3,
      "description": "Professional engineer services"
    },
    {
      "type": "service",
      "category": "Engineer",
      "name": "Engineer",
      "id": 3,
      "description": "Professional engineer services"
    }
  ]
}
```

#### Test Case 3: Search "plumb"
```http
GET http://localhost:8000/api/homepage/search/services?query=plumb
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "category",
      "category": "Plumber",
      "id": 25,
      "description": "Professional toilet clog service in the Plumber category"
    }
  ]
}
```

**Note:** Only returns the "Plumber" category because:
- ✅ "Plumber" category contains "plumb" 
- ❌ "Toilet Clog" and "Toilet Replacement" service names do NOT contain "plumb"

**Next Step:** User selects "Plumber" → Call API #2 to get granular services:
```http
GET http://localhost:8000/api/homepage/search/services/category/Plumber
```
```

#### Test Case 4: Invalid Query (too short)
```http
GET http://localhost:8000/api/homepage/search/services?query=ab
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 3 characters long"
  }
}
```

---

### 2️⃣ Get Category Services

**Endpoint:** `GET /api/homepage/search/services/category/:category`

**Purpose:** Get all services under a category (when user clicks category)

#### Test Case 1: Interior Cleaning
```http
GET http://localhost:8000/api/homepage/search/services/category/Interior%20Cleaning
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "category": "Interior Cleaning",
    "services": [
      {
        "id": 10,
        "name": "House Cleaning",
        "description": "Professional house cleaning service in the Interior Cleaning category"
      },
      {
        "id": 11,
        "name": "Office Cleaning",
        "description": "Professional office cleaning service in the Interior Cleaning category"
      }
    ]
  }
}
```

#### Test Case 2: Exterior Cleaning
```http
GET http://localhost:8000/api/homepage/search/services/category/Exterior%20Cleaning
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "category": "Exterior Cleaning",
    "services": [
      {
        "id": 20,
        "name": "House/Building Wash",
        "description": "Professional house/building wash service in the Exterior Cleaning category"
      },
      {
        "id": 21,
        "name": "Gutter Cleaning",
        "description": "Professional gutter cleaning service in the Exterior Cleaning category"
      },
      {
        "id": 22,
        "name": "Roof Cleaning",
        "description": "Professional roof cleaning service in the Exterior Cleaning category"
      },
      {
        "id": 23,
        "name": "Driveway Wash",
        "description": "Professional driveway wash service in the Exterior Cleaning category"
      },
      {
        "id": 24,
        "name": "Deck Cleaning",
        "description": "Professional deck cleaning service in the Exterior Cleaning category"
      },
      {
        "id": 25,
        "name": "Window Washing",
        "description": "Professional window washing service in the Exterior Cleaning category"
      }
    ]
  }
}
```

#### Test Case 3: Standalone Service (Engineer)
```http
GET http://localhost:8000/api/homepage/search/services/category/Engineer
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "category": "Engineer",
    "services": [
      {
        "id": 3,
        "name": "Engineer",
        "description": "Professional engineer services"
      }
    ]
  }
}
```

#### Test Case 4: Category Not Found
```http
GET http://localhost:8000/api/homepage/search/services/category/NonExistent
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "No services found for category: NonExistent"
  }
}
```

---

### 3️⃣ Location Search

**Endpoint:** `GET /api/homepage/search/locations`

**Purpose:** Search for ZIP codes (autocomplete)

#### Test Case 1: Search "75" (Dallas area)
```http
GET http://localhost:8000/api/homepage/search/locations?query=75&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "zipCode": "75001",
      "formattedAddress": "75001"
    },
    {
      "zipCode": "75002",
      "formattedAddress": "75002"
    }
  ]
}
```

#### Test Case 2: Search "97" (Oregon area)
```http
GET http://localhost:8000/api/homepage/search/locations?query=97&limit=5
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "zipCode": "97201",
      "formattedAddress": "97201"
    },
    {
      "zipCode": "97202",
      "formattedAddress": "97202"
    },
    {
      "zipCode": "97301",
      "formattedAddress": "97301"
    },
    {
      "zipCode": "97302",
      "formattedAddress": "97302"
    }
  ]
}
```

#### Test Case 3: No Results
```http
GET http://localhost:8000/api/homepage/search/locations?query=99999&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

#### Test Case 4: Invalid Query (too short)
```http
GET http://localhost:8000/api/homepage/search/locations?query=7
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 2 characters long"
  }
}
```

---

### 4️⃣ Provider Search

**Endpoint:** `POST /api/homepage/search/providers`

**Purpose:** Find providers by service name and ZIP code

#### Test Case 1: Basic Search (House Cleaning in Dallas)
```http
POST http://localhost:8000/api/homepage/search/providers
Content-Type: application/json

{
  "service": "House Cleaning",
  "zipcode": "75001"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": 1,
        "businessName": "Sparkle Clean Dallas",
        "ownerName": "Emily Davis",
        "rating": 4.5,
        "totalJobs": 145,
        "experience": 7,
        "description": "Professional house and office cleaning services...",
        "location": "Dallas, TX",
        "minPrice": 50,
        "maxPrice": 80,
        "phoneNumber": "+1-555-0106",
        "serviceAreas": ["75001", "75002"],
        "services": [
          {
            "id": 10,
            "name": "House Cleaning",
            "category": "Interior Cleaning"
          },
          {
            "id": 11,
            "name": "Office Cleaning",
            "category": "Interior Cleaning"
          }
        ]
      },
      {
        "id": 2,
        "businessName": "Elite Clean Services",
        "ownerName": "Robert Martinez",
        "rating": 5.0,
        "totalJobs": 98,
        "experience": 10,
        "description": "Premium cleaning services for homes and offices...",
        "location": "Dallas, TX",
        "minPrice": 55,
        "maxPrice": 85,
        "phoneNumber": "+1-555-0107",
        "serviceAreas": ["75001"],
        "services": [
          {
            "id": 10,
            "name": "House Cleaning",
            "category": "Interior Cleaning"
          }
        ]
      }
    ],
    "count": 2,
    "service": {
      "id": 10,
      "name": "House Cleaning",
      "category": "Interior Cleaning"
    },
    "location": "75001"
  }
}
```

#### Test Case 2: With Filters (Min Rating)
```http
POST http://localhost:8000/api/homepage/search/providers
Content-Type: application/json

{
  "service": "House Cleaning",
  "zipcode": "75001",
  "filters": {
    "minRating": 4.5
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": 2,
        "businessName": "Elite Clean Services",
        "ownerName": "Robert Martinez",
        "rating": 5.0,
        "totalJobs": 98,
        "experience": 10,
        "description": "Premium cleaning services...",
        "location": "Dallas, TX",
        "minPrice": 55,
        "maxPrice": 85,
        "phoneNumber": "+1-555-0107",
        "serviceAreas": ["75001"],
        "services": [...]
      },
      {
        "id": 1,
        "businessName": "Sparkle Clean Dallas",
        "ownerName": "Emily Davis",
        "rating": 4.5,
        "totalJobs": 145,
        "experience": 7,
        "description": "Professional cleaning...",
        "location": "Dallas, TX",
        "minPrice": 50,
        "maxPrice": 80,
        "phoneNumber": "+1-555-0106",
        "serviceAreas": ["75001", "75002"],
        "services": [...]
      }
    ],
    "count": 2,
    "service": {
      "id": 10,
      "name": "House Cleaning",
      "category": "Interior Cleaning"
    },
    "location": "75001"
  }
}
```

#### Test Case 3: With Max Price Filter
```http
POST http://localhost:8000/api/homepage/search/providers
Content-Type: application/json

{
  "service": "House Cleaning",
  "zipcode": "75001",
  "filters": {
    "maxPrice": 60
  }
}
```

**Expected Response:** (Only providers with maxPrice <= 60)
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": 1,
        "businessName": "Sparkle Clean Dallas",
        "ownerName": "Emily Davis",
        "rating": 4.5,
        "minPrice": 50,
        "maxPrice": 60,
        ...
      }
    ],
    "count": 1,
    "service": {
      "id": 10,
      "name": "House Cleaning",
      "category": "Interior Cleaning"
    },
    "location": "75001"
  }
}
```

#### Test Case 4: No Providers Found
```http
POST http://localhost:8000/api/homepage/search/providers
Content-Type: application/json

{
  "service": "House Cleaning",
  "zipcode": "99999"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "providers": [],
    "count": 0,
    "service": {
      "id": 10,
      "name": "House Cleaning",
      "category": "Interior Cleaning"
    },
    "location": "99999"
  }
}
```

#### Test Case 5: Service Not Found
```http
POST http://localhost:8000/api/homepage/search/providers
Content-Type: application/json

{
  "service": "NonExistent Service",
  "zipcode": "75001"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "Service not found: NonExistent Service"
  }
}
```

---

## 📋 Postman Collection Setup

### Import These Requests:

1. **Service Search**
   - Method: GET
   - URL: `{{baseUrl}}/homepage/search/services?query=clean`

2. **Category Services**
   - Method: GET
   - URL: `{{baseUrl}}/homepage/search/services/category/Interior Cleaning`

3. **Location Search**
   - Method: GET
   - URL: `{{baseUrl}}/homepage/search/locations?query=75&limit=10`

4. **Provider Search**
   - Method: POST
   - URL: `{{baseUrl}}/homepage/search/providers`
   - Body (JSON):
   ```json
   {
     "service": "House Cleaning",
     "zipcode": "75001",
     "filters": {
       "minRating": 4.0
     }
   }
   ```

### Environment Variables:
```
baseUrl = http://localhost:8000/api
```

---

## 🧪 Testing Workflow

### Complete User Flow Test:

1. **Search for service** → `GET /services?query=clean`
2. **User sees "Interior Cleaning" category** → `GET /services/category/Interior%20Cleaning`
3. **User selects "House Cleaning"** → Store service name
4. **Search for location** → `GET /locations?query=75`
5. **User selects "75001"** → Store ZIP code
6. **Search for providers** → `POST /providers` with service + ZIP

---

## 🔍 Debugging Tips

### Check if services are seeded:
```sql
-- In your database
SELECT category, name, status FROM services WHERE status = 'approved' LIMIT 10;
```

### Check if providers have service areas:
```sql
SELECT p.id, p.business_name, psa.zipcode 
FROM service_providers p
JOIN provider_service_areas psa ON p.id = psa.provider_id
LIMIT 10;
```

### Check if providers offer services:
```sql
SELECT p.business_name, s.name as service_name, s.category
FROM provider_services ps
JOIN service_providers p ON ps.provider_id = p.id
JOIN services s ON ps.service_id = s.id
WHERE ps.is_active = true
LIMIT 10;
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Service not found"
**Cause:** Service name doesn't match exactly
**Solution:** Check exact service name in database:
```sql
SELECT name FROM services WHERE name ILIKE '%house%';
```

### Issue 2: "No providers found"
**Cause:** No providers in that ZIP code with that service
**Solution:** 
1. Check providers exist: `SELECT * FROM service_providers WHERE status = 'active';`
2. Check service areas: `SELECT * FROM provider_service_areas WHERE zipcode = '75001';`
3. Check provider services: `SELECT * FROM provider_services WHERE is_active = true;`

### Issue 3: Empty location results
**Cause:** No providers in that ZIP code
**Solution:** The API returns ZIPs only where providers exist. Add providers to test ZIPs.

### Issue 4: Module not found error
**Cause:** Module not registered in app.module.ts
**Solution:** Already done! HomepageModule is registered.

---

## 📊 Test Data Summary

### Services Available (after seeding):
- Interior Cleaning → House Cleaning, Office Cleaning
- Exterior Cleaning → 6 services (House Wash, Gutter, Roof, etc.)
- Plumber → Toilet Clog, Toilet Replacement
- Engineer, Electrician, etc. → Standalone services

### ZIP Codes (example):
- 75001, 75002 (Dallas, TX)
- 97201, 97202, 97301, 97302 (Oregon)

### Sample Providers (to create for testing):
You'll need to create providers with:
- Services linked via `provider_services` table
- Service areas via `provider_service_areas` table

---

## 🚀 Next Steps

1. ✅ Run seed script: `npx ts-node prisma/seed-services.ts`
2. ✅ Start server: `npm run start:dev`
3. ✅ Test endpoints in Postman
4. ✅ Create test providers with service areas
5. ✅ Integrate with frontend

---

## 📝 API Response Format

All endpoints follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## ✅ Implementation Complete!

All files created and module registered. The APIs are ready to test! 🎉

**Start testing with:** Service Search → `GET /api/homepage/search/services?query=clean`

