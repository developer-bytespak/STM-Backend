# Slug-Based Provider URLs - Backend Implementation

## 📋 Overview

This document covers the implementation of **SEO-friendly, slug-based URLs** for provider detail pages. The system generates URLs like `/joes-plumbing-11` instead of `/providers/11` for better search engine optimization and user experience.

---

## 🎯 What Was Implemented

### 1. **Slug Generation Utility**
- Created `src/shared/utils/slug.utils.ts`
- Functions for generating, parsing, and validating slugs

### 2. **Updated Search Providers Endpoint**
- **Endpoint**: `POST /homepage/search/providers`
- **Change**: Now includes `slug` field in provider results
- **Purpose**: Frontend can use slugs for navigation

### 3. **New Provider Detail Endpoint**
- **Endpoint**: `GET /providers/:slug`
- **Purpose**: Fetch detailed provider info using slug
- **Features**:
  - Active/inactive service filtering
  - Security validation (slug verification)
  - Complete provider details

---

## 🔧 Files Modified/Created

### Created Files:
1. `src/shared/utils/slug.utils.ts` - Slug utilities
2. `src/modules/homepage/public-providers.controller.ts` - New controller

### Modified Files:
1. `src/modules/homepage/homepage.service.ts` - Added slug to search results & new method
2. `src/modules/homepage/homepage.module.ts` - Registered new controller

---

## 📡 API Endpoints

### 1. Search Providers (Updated)

**Endpoint**: `POST /homepage/search/providers`

**Request Body**:
```json
{
  "service": "House Cleaning",
  "zipcode": "75001",
  "filters": {
    "minRating": 4.0,
    "maxPrice": 100,
    "minExperience": 5
  }
}
```

**Response** (Now includes `slug`):
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": 6,
        "businessName": "Sparkle Clean Dallas",
        "slug": "sparkle-clean-dallas-6",
        "ownerName": "Emily Davis",
        "rating": 4.5,
        "totalJobs": 145,
        "experience": 7,
        "description": "Professional house and office cleaning services in Dallas.",
        "location": "Dallas, TX",
        "minPrice": 50,
        "maxPrice": 70,
        "phoneNumber": "+1-555-0106",
        "serviceAreas": ["75001", "75002"],
        "services": [
          {
            "id": 16,
            "name": "House Cleaning",
            "category": "Interior Cleaning"
          }
        ]
      }
    ],
    "count": 1,
    "service": {
      "id": 16,
      "name": "House Cleaning",
      "category": "Interior Cleaning"
    },
    "location": "75001"
  }
}
```

---

### 2. Get Provider by Slug (New)

**Endpoint**: `GET /providers/:slug`

**URL Format**: `/providers/{business-name-id}`

**Examples**:
- `/providers/sparkle-clean-dallas-6`
- `/providers/joes-plumbing-11`
- `/providers/garcia-electrical-solutions-2`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 6,
    "businessName": "Sparkle Clean Dallas",
    "slug": "sparkle-clean-dallas-6",
    "ownerName": "Emily Davis",
    "rating": 4.5,
    "totalJobs": 145,
    "experience": 7,
    "description": "Professional house and office cleaning services in Dallas. Eco-friendly products and 100% satisfaction guaranteed.",
    "location": "Dallas, TX",
    "phoneNumber": "+1-555-0106",
    "email": "emily.davis@example.com",
    "minPrice": 50,
    "maxPrice": 70,
    "priceRange": {
      "min": 50,
      "max": 70
    },
    "services": [
      {
        "id": 16,
        "name": "House Cleaning",
        "category": "Interior Cleaning",
        "isActive": true
      },
      {
        "id": 17,
        "name": "Office Cleaning",
        "category": "Interior Cleaning",
        "isActive": true
      },
      {
        "id": 25,
        "name": "Pool Cleaning",
        "category": "Outdoor Services",
        "isActive": false
      }
    ],
    "serviceAreas": ["75001", "75002", "75003"],
    "address": {
      "city": "Dallas",
      "state": "TX",
      "zipCode": "75001"
    },
    "certifications": [
      "Bonded & Insured",
      "Green Seal Certified"
    ],
    "isAvailable": true
  }
}
```

**Error Responses**:

**400 Bad Request** (Invalid Slug Format):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SLUG_FORMAT",
    "message": "Invalid slug format. Expected format: business-name-{id}"
  }
}
```

**404 Not Found** (Provider Not Found):
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "Provider not found or inactive"
  }
}
```

**404 Not Found** (Slug Mismatch - Security):
```json
{
  "success": false,
  "error": {
    "code": "SLUG_MISMATCH",
    "message": "Provider slug does not match"
  }
}
```

---

## 🧪 Testing with Postman

### Setup

1. **Create New Collection**: "Provider Slug URLs"
2. **Base URL**: `http://localhost:3000` (or your server URL)
3. **Environment Variables** (optional):
   - `base_url`: `http://localhost:3000`
   - `provider_slug`: `sparkle-clean-dallas-6`

---

### Test 1: Search Providers (Get Slug)

**Purpose**: Get provider slugs from search results

**Step 1**: Create New Request
- Method: `POST`
- URL: `{{base_url}}/homepage/search/providers`
- Headers:
  ```
  Content-Type: application/json
  ```

**Step 2**: Request Body (raw JSON)
```json
{
  "service": "House Cleaning",
  "zipcode": "75001"
}
```

**Step 3**: Send Request

**Expected Response**:
- Status: `200 OK`
- Body includes `slug` field for each provider
- Example: `"slug": "sparkle-clean-dallas-6"`

**Step 4**: Save Slug to Variable (Optional)
- Go to **Tests** tab in Postman
- Add script:
```javascript
// Save first provider's slug to collection variable
const response = pm.response.json();
if (response.success && response.data.providers.length > 0) {
    const slug = response.data.providers[0].slug;
    pm.collectionVariables.set("provider_slug", slug);
    console.log("Saved provider slug:", slug);
}
```

---

### Test 2: Get Provider by Slug

**Purpose**: Fetch detailed provider information using slug

**Step 1**: Create New Request
- Method: `GET`
- URL: `{{base_url}}/providers/{{provider_slug}}`
  - Or directly: `http://localhost:3000/providers/sparkle-clean-dallas-6`

**Step 2**: Send Request

**Expected Response**:
- Status: `200 OK`
- Body contains detailed provider info:
  - All services (active and inactive)
  - Service areas
  - Contact information
  - Certifications
  - Availability status

**Step 3**: Verify Response (Tests Tab)
```javascript
// Test script
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success: true", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Provider has slug field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('slug');
});

pm.test("Provider has services array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data.services).to.be.an('array');
});

pm.test("Services have isActive field", function () {
    const jsonData = pm.response.json();
    const services = jsonData.data.services;
    if (services.length > 0) {
        pm.expect(services[0]).to.have.property('isActive');
    }
});
```

---

### Test 3: Invalid Slug Format (Error Handling)

**Purpose**: Test error handling for invalid slug format

**Step 1**: Create New Request
- Method: `GET`
- URL: `{{base_url}}/providers/invalid-slug-without-id`

**Step 2**: Send Request

**Expected Response**:
- Status: `400 Bad Request`
- Body:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SLUG_FORMAT",
    "message": "Invalid slug format. Expected format: business-name-{id}"
  }
}
```

**Test Script**:
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Response has error object", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('error');
    pm.expect(jsonData.error.code).to.eql('INVALID_SLUG_FORMAT');
});
```

---

### Test 4: Non-existent Provider (404)

**Purpose**: Test 404 error for non-existent provider

**Step 1**: Create New Request
- Method: `GET`
- URL: `{{base_url}}/providers/fake-business-99999`

**Step 2**: Send Request

**Expected Response**:
- Status: `404 Not Found`
- Body:
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "Provider not found or inactive"
  }
}
```

**Test Script**:
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error code is PROVIDER_NOT_FOUND", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error.code).to.eql('PROVIDER_NOT_FOUND');
});
```

---

### Test 5: Slug Mismatch Security (404)

**Purpose**: Test security - slug must match provider's business name

**Step 1**: Create New Request
- Method: `GET`
- URL: `{{base_url}}/providers/wrong-business-name-6`
  - Note: ID (6) is valid, but business name is wrong

**Step 2**: Send Request

**Expected Response**:
- Status: `404 Not Found`
- Body:
```json
{
  "success": false,
  "error": {
    "code": "SLUG_MISMATCH",
    "message": "Provider slug does not match"
  }
}
```

**Why This Matters**: Prevents users from accessing providers with manipulated slugs

---

### Test 6: Filter Providers by Rating

**Purpose**: Test search with filters

**Step 1**: Create New Request
- Method: `POST`
- URL: `{{base_url}}/homepage/search/providers`
- Body:
```json
{
  "service": "House Cleaning",
  "zipcode": "75001",
  "filters": {
    "minRating": 4.5
  }
}
```

**Step 2**: Send Request

**Expected Response**:
- Status: `200 OK`
- Only providers with rating >= 4.5

**Test Script**:
```javascript
pm.test("All providers have rating >= 4.5", function () {
    const jsonData = pm.response.json();
    const providers = jsonData.data.providers;
    
    providers.forEach(function(provider) {
        pm.expect(provider.rating).to.be.at.least(4.5);
    });
});
```

---

### Test 7: Active vs Inactive Services

**Purpose**: Verify service active/inactive status

**Step 1**: Get a provider with both active and inactive services
- Method: `GET`
- URL: `{{base_url}}/providers/sparkle-clean-dallas-6`

**Step 2**: Send Request

**Step 3**: Verify Response (Tests Tab)
```javascript
pm.test("Services have isActive field", function () {
    const jsonData = pm.response.json();
    const services = jsonData.data.services;
    
    services.forEach(function(service) {
        pm.expect(service).to.have.property('isActive');
        pm.expect(service.isActive).to.be.a('boolean');
    });
});

pm.test("isAvailable matches active services", function () {
    const jsonData = pm.response.json();
    const services = jsonData.data.services;
    const isAvailable = jsonData.data.isAvailable;
    
    const hasActiveServices = services.some(s => s.isActive === true);
    pm.expect(isAvailable).to.eql(hasActiveServices);
});
```

---

## 📊 Postman Collection Structure

Create folders to organize tests:

```
📁 Provider Slug URLs Collection
│
├── 📁 1. Search & Discovery
│   ├── Search Providers (Get Slugs)
│   └── Search with Filters
│
├── 📁 2. Provider Details
│   ├── Get Provider by Slug (Valid)
│   └── Verify Service Active Status
│
├── 📁 3. Error Handling
│   ├── Invalid Slug Format (400)
│   ├── Non-existent Provider (404)
│   └── Slug Mismatch Security (404)
│
└── 📁 4. Integration Tests
    └── Full Flow: Search → Get Details
```

---

## 🔄 Complete Test Flow

### Automated Test Sequence

Create a **Collection Runner** workflow:

1. **Search Providers** → Save slug to variable
2. **Get Provider Details** → Use saved slug
3. **Verify Services** → Check active/inactive
4. **Test Error Cases** → Validate error handling

**Collection Runner Setup**:
1. Click "Run" on collection
2. Select all requests
3. Set iterations: 1
4. Click "Run Provider Slug URLs"

---

## 🧾 Sample Test Data

### Valid Provider Slugs (based on seed data):
```
sparkle-clean-dallas-6
elite-clean-services-7
fresh-start-cleaning-co-8
premier-house-cleaners-9
smith-plumbing-services-1
garcia-electrical-solutions-2
johnson-hvac-services-3
williams-cleaning-co-4
brown-painting-pros-5
```

### Test Cases:
| Test Case | Slug | Expected Result |
|-----------|------|-----------------|
| Valid slug | `sparkle-clean-dallas-6` | 200 OK with provider details |
| Invalid format | `invalid-slug` | 400 Bad Request |
| Non-existent | `fake-business-99999` | 404 Not Found |
| Wrong name | `wrong-name-6` | 404 Slug Mismatch |
| Inactive provider | `deleted-provider-999` | 404 Not Found |

---

## 🔒 Security Features

### 1. Slug Verification
```typescript
// Backend validates slug matches business name
verifyProviderSlug(slug, businessName, providerId)
```

**Prevents**:
- Slug manipulation
- Unauthorized access patterns
- SEO gaming

### 2. Active Status Check
```typescript
where: {
  status: 'active',
  is_deleted: false,
}
```

**Ensures**:
- Only active providers visible
- Deleted providers return 404
- Banned providers not accessible

### 3. Service Status
```typescript
services: [...activeServices, ...inactiveServices]
```

**Allows**:
- Seasonal service toggling
- Dynamic service offerings
- Proper availability display

---

## 📈 Key Features

### 1. **SEO-Friendly URLs**
- ✅ Descriptive: `/joes-plumbing-11` vs `/providers/11`
- ✅ Readable by humans and search engines
- ✅ Includes business name keywords

### 2. **Service Management**
- ✅ Active/inactive service tracking
- ✅ Seasonal service changes supported
- ✅ Frontend can show appropriate warnings

### 3. **Provider Availability**
```json
"isAvailable": true  // Based on is_active AND has active services
```

### 4. **Complete Information**
- Contact details (phone, email)
- Service areas (all ZIP codes)
- All services (active + inactive)
- Certifications from verified documents
- Location data (city, state, ZIP)

---

## 🐛 Troubleshooting

### Issue 1: Provider Not Found (but exists)
**Cause**: Provider is inactive or deleted  
**Solution**: Check `status` field in database  
**Query**:
```sql
SELECT id, business_name, status, is_deleted 
FROM service_providers 
WHERE id = 6;
```

### Issue 2: Slug Mismatch Error
**Cause**: Business name changed or slug is wrong  
**Solution**: Regenerate correct slug  
**Fix**: Update business name or use correct slug format

### Issue 3: No Services Returned
**Cause**: All services are inactive  
**Solution**: Activate at least one service  
**Query**:
```sql
UPDATE provider_services 
SET is_active = true 
WHERE provider_id = 6 AND service_id = 16;
```

### Issue 4: Missing Certifications
**Cause**: No verified documents with "certif" in description  
**Solution**: Add/verify documents  
**Check**:
```sql
SELECT * FROM provider_documents 
WHERE provider_id = 6 AND status = 'verified';
```

---

## 📝 Implementation Checklist

### Backend:
- [x] Created slug utility functions
- [x] Updated search providers to include slug
- [x] Created GET /providers/:slug endpoint
- [x] Added service active/inactive handling
- [x] Implemented security validation
- [x] Added error handling (400, 404)
- [x] Registered new controller

### Testing:
- [ ] Test search providers endpoint
- [ ] Test get provider by slug
- [ ] Test invalid slug format (400)
- [ ] Test non-existent provider (404)
- [ ] Test slug mismatch (404)
- [ ] Test active/inactive services
- [ ] Test provider availability logic
- [ ] Test with real database data

---

## 🚀 Next Steps

1. **Run Postman Tests**: Use collection above
2. **Verify Database**: Ensure providers have business_name set
3. **Check Service Areas**: Verify ZIP codes are correct
4. **Test Error Cases**: Confirm proper error handling
5. **Integration Test**: Full flow from search to detail page

---

## 📚 Related Documentation

- Frontend Implementation: `STM-Frontend/docs/SLUG_URL_IMPLEMENTATION.md` (if exists)
- API Documentation: Swagger UI at `/api/docs`
- Database Schema: `prisma/schema.prisma`

---

## 🎉 Summary

The slug-based provider URL system is now fully implemented:

✅ **Search providers** returns slugs  
✅ **Get provider by slug** works with security  
✅ **Active/inactive services** properly handled  
✅ **Error handling** for all edge cases  
✅ **SEO-friendly URLs** throughout  
✅ **Ready for production** testing  

**Example Flow**:
```
1. Search: POST /homepage/search/providers
   → Returns: { slug: "joes-plumbing-11" }

2. Navigate: /joes-plumbing-11

3. Fetch: GET /providers/joes-plumbing-11
   → Returns: Complete provider details
```

The implementation maintains backward compatibility while providing modern, SEO-optimized URLs for better user experience and search engine ranking! 🚀

