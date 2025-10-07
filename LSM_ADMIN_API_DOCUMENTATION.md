# 👔 LSM & 👨‍💼 Admin APIs - Complete Documentation

---

## ✅ **What Was Created**

### **LSM Module** (`src/modules/lsm/`)
- ✅ `lsm.controller.ts` - LSM endpoints
- ✅ `lsm.service.ts` - LSM business logic
- ✅ `lsm.module.ts` - Module configuration
- ✅ DTOs:
  - `approve-service-request.dto.ts`
  - `reject-service-request.dto.ts`
  - `document-action.dto.ts`

### **Admin Module** (`src/modules/admin/`)
- ✅ `admin.controller.ts` - Admin endpoints
- ✅ `admin.service.ts` - Admin business logic
- ✅ `admin.module.ts` - Module configuration
- ✅ DTOs:
  - `create-lsm.dto.ts`
  - `update-service.dto.ts`
  - `ban-provider.dto.ts`

---

## 📡 **LSM APIs**

### **1️⃣ View Pending Service Requests**

**Endpoint:** `GET /lsm/service-requests/pending`

**Headers:**
```json
{
  "Authorization": "Bearer <lsm-token>"
}
```

**Response:**
```json
[
  {
    "id": 45,
    "serviceName": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "description": "Professional pool cleaning services",
    "provider": {
      "id": 42,
      "businessName": "ABC Services",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+15551234567"
      }
    },
    "created_at": "2025-10-07T12:00:00.000Z"
  }
]
```

**What it shows:**
- Only service requests from providers in YOUR region
- Only requests that haven't been approved by LSM yet
- Provider details who requested it

---

### **2️⃣ Approve Service Request**

**Endpoint:** `POST /lsm/service-requests/:id/approve`

**Headers:**
```json
{
  "Authorization": "Bearer <lsm-token>"
}
```

**Body:** (Optional)
```json
{
  "notes": "Good service for our region"
}
```

**Response:**
```json
{
  "id": 45,
  "status": "pending_admin_approval",
  "message": "Service request approved and sent to admin for final approval"
}
```

**What happens:**
1. ✅ Request marked as `lsm_approved: true`
2. ✅ LSM review timestamp recorded
3. ✅ All admins notified for final approval

---

### **3️⃣ Reject Service Request**

**Endpoint:** `POST /lsm/service-requests/:id/reject`

**Headers:**
```json
{
  "Authorization": "Bearer <lsm-token>"
}
```

**Body:**
```json
{
  "reason": "Service too niche for our region"
}
```

**Response:**
```json
{
  "id": 45,
  "status": "rejected",
  "reason": "Service too niche for our region",
  "message": "Service request rejected"
}
```

**What happens:**
1. ✅ Request marked as `final_status: rejected`
2. ✅ Rejection reason stored
3. ✅ Provider notified with reason

---

### **4️⃣ View Providers in Region**

**Endpoint:** `GET /lsm/providers`

**Headers:**
```json
{
  "Authorization": "Bearer <lsm-token>"
}
```

**Response:**
```json
[
  {
    "id": 42,
    "businessName": "ABC Plumbing",
    "status": "active",
    "rating": 4.8,
    "experience": 10,
    "totalJobs": 150,
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@plumbing.com",
      "phone_number": "+15551234567"
    },
    "serviceAreas": ["10001", "10002", "10003"],
    "services": [
      {
        "name": "Toilet Clog",
        "category": "Plumber"
      },
      {
        "name": "Toilet Replacement",
        "category": "Plumber"
      }
    ],
    "documentCount": 3,
    "jobCount": 150,
    "created_at": "2025-01-01T12:00:00.000Z"
  }
]
```

**What it shows:**
- All providers assigned to YOUR LSM
- Their status, rating, experience
- Services they offer
- Document and job counts

---

### **5️⃣ Verify or Reject Provider Document**

**Endpoint:** `POST /lsm/providers/:providerId/documents/:documentId`

**Headers:**
```json
{
  "Authorization": "Bearer <lsm-token>"
}
```

**Body (Verify):**
```json
{
  "action": "verify"
}
```

**Body (Reject):**
```json
{
  "action": "reject",
  "reason": "Document is not clear enough"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "verified",
  "action": "verify",
  "message": "Document verified successfully"
}
```

**What happens:**
1. ✅ Document status updated (verified/rejected)
2. ✅ LSM user_id recorded as verifier
3. ✅ Provider notified

---

## 📡 **Admin APIs**

### **1️⃣ View LSM-Approved Service Requests**

**Endpoint:** `GET /admin/service-requests/pending`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**
```json
[
  {
    "id": 45,
    "serviceName": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "description": "Professional pool cleaning",
    "questions_json": {
      "questions": [...]
    },
    "region": "New York",
    "provider": {
      "id": 42,
      "businessName": "ABC Services",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    },
    "lsm": {
      "name": "Manager Smith",
      "region": "New York"
    },
    "lsm_reviewed_at": "2025-10-07T10:00:00.000Z",
    "created_at": "2025-10-07T09:00:00.000Z"
  }
]
```

**What it shows:**
- Only requests already approved by LSM
- LSM who approved it
- Provider who requested it
- All service details

---

### **2️⃣ Approve Service Request (Creates Service)**

**Endpoint:** `POST /admin/service-requests/:id/approve`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**
```json
{
  "service": {
    "id": 50,
    "name": "Pool Cleaning",
    "category": "Exterior Cleaner"
  },
  "message": "Service created and provider linked successfully"
}
```

**What happens (Transaction):**
1. ✅ Creates new service in `services` table
2. ✅ Links provider to service in `provider_services` table
3. ✅ Updates service_request (admin_approved: true)
4. ✅ Provider notified
5. ✅ Service is now live and searchable by customers

---

### **3️⃣ Reject Service Request**

**Endpoint:** `POST /admin/service-requests/:id/reject`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Body:**
```json
{
  "reason": "Service already exists under a different name"
}
```

**Response:**
```json
{
  "id": 45,
  "status": "rejected",
  "reason": "Service already exists under a different name",
  "message": "Service request rejected"
}
```

**What happens:**
1. ✅ Request marked as rejected
2. ✅ Admin rejection reason stored
3. ✅ Provider notified with reason

---

### **4️⃣ Get All Services**

**Endpoint:** `GET /admin/services`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**
```json
[
  {
    "id": 5,
    "name": "Toilet Clog",
    "category": "Plumber",
    "description": "Professional toilet clog removal",
    "status": "approved",
    "is_popular": true,
    "activeProviders": 15,
    "totalJobs": 450,
    "created_at": "2025-01-01T12:00:00.000Z"
  },
  {
    "id": 50,
    "name": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "status": "approved",
    "is_popular": false,
    "activeProviders": 1,
    "totalJobs": 0,
    "created_at": "2025-10-07T12:00:00.000Z"
  }
]
```

**What it shows:**
- All services in the system
- Active provider count per service
- Total job count per service
- Popularity status

---

### **5️⃣ Update Service**

**Endpoint:** `PUT /admin/services/:id`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Body:**
```json
{
  "name": "Toilet Clog Removal",
  "description": "Updated description",
  "category": "Plumber",
  "questions_json": {
    "questions": [
      {
        "id": "urgency",
        "type": "select",
        "label": "How urgent is this?",
        "options": ["Emergency", "This week", "Flexible"]
      },
      {
        "id": "toilet_type",
        "type": "select",
        "label": "Toilet type",
        "options": ["Standard", "Low-flow", "Dual-flush"]
      }
    ]
  },
  "is_popular": true
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Toilet Clog Removal",
  "category": "Plumber",
  "description": "Updated description",
  "is_popular": true,
  "updated_at": "2025-10-07T12:00:00.000Z",
  "message": "Service updated successfully"
}
```

---

### **6️⃣ Delete Service (Soft Delete)**

**Endpoint:** `DELETE /admin/services/:id`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**
```json
{
  "id": 50,
  "message": "Service deactivated successfully"
}
```

**What happens:**
1. ✅ Checks if service has active jobs (prevents deletion if yes)
2. ✅ Sets service status to `rejected` (soft delete)
3. ✅ Deactivates all provider links (is_active: false)

**Error if active jobs:**
```json
{
  "statusCode": 400,
  "message": "Cannot delete service with active jobs. Please wait for jobs to complete.",
  "error": "Bad Request"
}
```

---

### **7️⃣ Create LSM**

**Endpoint:** `POST /admin/lsm/create`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Body:**
```json
{
  "email": "lsm@california.com",
  "password": "SecurePass123",
  "firstName": "Mike",
  "lastName": "Johnson",
  "phoneNumber": "+15559876543",
  "region": "California"
}
```

**Response:**
```json
{
  "id": 5,
  "user": {
    "id": 100,
    "email": "lsm@california.com",
    "firstName": "Mike",
    "lastName": "Johnson"
  },
  "region": "California",
  "status": "active",
  "message": "LSM created successfully"
}
```

**What happens:**
1. ✅ Creates user with role `local_service_manager`
2. ✅ Creates LSM profile linked to user
3. ✅ Password hashed with bcrypt
4. ✅ LSM can now manage providers in California region

**Validation:**
- Email must be unique
- Only 1 LSM per region allowed

---

### **8️⃣ Ban Service Provider**

**Endpoint:** `POST /admin/providers/:id/ban`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Body:**
```json
{
  "reason": "Multiple customer complaints and poor service quality"
}
```

**Response:**
```json
{
  "id": 42,
  "status": "banned",
  "reason": "Multiple customer complaints and poor service quality",
  "message": "Provider banned successfully"
}
```

**What happens:**
1. ✅ Checks if provider has active jobs (prevents ban if yes)
2. ✅ Updates provider status to `banned`
3. ✅ Stores ban reason
4. ✅ Provider notified
5. ✅ Provider can no longer receive jobs

**Error if active jobs:**
```json
{
  "statusCode": 400,
  "message": "Cannot ban provider with 3 active jobs. Please wait for jobs to complete.",
  "error": "Bad Request"
}
```

---

### **9️⃣ Unban Service Provider**

**Endpoint:** `POST /admin/providers/:id/unban`

**Headers:**
```json
{
  "Authorization": "Bearer <admin-token>"
}
```

**Response:**
```json
{
  "id": 42,
  "status": "active",
  "message": "Provider unbanned successfully"
}
```

**What happens:**
1. ✅ Updates provider status to `active`
2. ✅ Clears rejection_reason
3. ✅ Provider notified
4. ✅ Provider can receive jobs again

---

## 🔄 **Complete Workflows**

### **Workflow 1: Service Request Approval**

```
1. SP requests new service
   POST /provider/request-new-service
   ↓
   service_requests table:
   - lsm_approved: false
   - admin_approved: false
   - final_status: pending

2. LSM reviews in their region
   GET /lsm/service-requests/pending
   ↓
   LSM approves:
   POST /lsm/service-requests/:id/approve
   ↓
   service_requests updated:
   - lsm_approved: true ✅
   - lsm_reviewed_by: <lsm-user-id>
   - lsm_reviewed_at: <timestamp>
   ↓
   All admins notified

3. Admin reviews LSM-approved requests
   GET /admin/service-requests/pending
   ↓
   Admin approves:
   POST /admin/service-requests/:id/approve
   ↓
   TRANSACTION:
   a) Create service in `services` table
   b) Link SP in `provider_services` table
   c) Update service_request (admin_approved: true, final_status: approved)
   d) Notify provider
   ↓
   Service is now LIVE!
   Customers can search and book it

Alternative: LSM or Admin rejects
   ↓
   POST /lsm/service-requests/:id/reject
   or
   POST /admin/service-requests/:id/reject
   ↓
   final_status: rejected
   Provider notified with reason
```

---

### **Workflow 2: Document Verification**

```
1. Provider uploads documents
   POST /provider-onboarding/documents/upload
   ↓
   provider_documents table:
   - status: pending

2. LSM views providers in region
   GET /lsm/providers
   ↓
   LSM clicks on provider → sees documents

3. LSM verifies or rejects
   POST /lsm/providers/:providerId/documents/:documentId
   Body: { "action": "verify" }
   ↓
   provider_documents updated:
   - status: verified
   - verified_by: <lsm-user-id>
   - verified_at: <timestamp>
   ↓
   Provider notified

Alternative: Reject
   Body: { "action": "reject", "reason": "..." }
   ↓
   status: rejected
   Provider can re-upload
```

---

### **Workflow 3: LSM Creation**

```
1. Admin creates LSM
   POST /admin/lsm/create
   Body: {
     email, password, firstName, lastName,
     phoneNumber, region: "California"
   }
   ↓
   TRANSACTION:
   a) Create user (role: local_service_manager)
   b) Create LSM profile (region: California)
   ↓
   LSM can now log in

2. Providers in California register
   POST /auth/register (role: PROVIDER, region: California)
   ↓
   Auto-assigned to California LSM

3. California LSM manages their providers
   GET /lsm/providers
   ↓
   Shows all California providers
```

---

### **Workflow 4: Provider Ban (Admin Direct)**

```
Option 1: Admin bans directly
   POST /admin/providers/:id/ban
   Body: { "reason": "..." }
   ↓
   Provider status: banned
   Provider notified
   Can no longer receive jobs

Option 2: Provider unbanned
   POST /admin/providers/:id/unban
   ↓
   Provider status: active
   Can receive jobs again
```

**Note:** For LSM-requested bans (LSM requests → Admin approves), you can add this later if needed. For now, admin has direct ban/unban power.

---

## 📊 **Database Impact**

### **service_requests Table**
```
Before LSM approval:
- lsm_approved: false
- admin_approved: false
- final_status: pending

After LSM approval:
- lsm_approved: true ✅
- lsm_reviewed_by: 10
- lsm_reviewed_at: <timestamp>
- final_status: pending (still waiting for admin)

After Admin approval:
- admin_approved: true ✅
- admin_reviewed_by: 1
- admin_reviewed_at: <timestamp>
- final_status: approved
- created_service_id: 50 (links to new service)
```

### **services Table (After Admin Approval)**
```
New row created:
id: 50
name: "Pool Cleaning"
category: "Exterior Cleaner"
status: approved
```

### **provider_services Table**
```
New link created:
provider_id: 42
service_id: 50
is_active: true
```

---

## 🎯 **Key Features**

### **LSM APIs:**
- ✅ Regional access control (only see their region)
- ✅ Service request approval workflow
- ✅ Provider management
- ✅ Document verification

### **Admin APIs:**
- ✅ Platform-wide service management
- ✅ Final service request approval
- ✅ LSM creation
- ✅ Provider ban/unban
- ✅ Service CRUD operations

---

## ⚠️ **Important Notes**

1. **Region Isolation:** LSMs only see/manage providers in their assigned region
2. **Dual Approval:** Service requests need both LSM + Admin approval
3. **Soft Deletes:** Services aren't hard-deleted, just deactivated
4. **Active Job Protection:** Can't ban providers or delete services with active jobs
5. **One LSM Per Region:** Enforced at database level
6. **Document Verification:** Only LSM can verify documents (not admin)

---

## 🚀 **Testing Commands**

### **LSM Testing:**
```bash
# Login as LSM
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "lsm@newyork.com", "password": "password123"}'

# Get pending requests
curl -X GET http://localhost:8000/lsm/service-requests/pending \
  -H "Authorization: Bearer <lsm-token>"

# Approve request
curl -X POST http://localhost:8000/lsm/service-requests/45/approve \
  -H "Authorization: Bearer <lsm-token>"

# Get providers
curl -X GET http://localhost:8000/lsm/providers \
  -H "Authorization: Bearer <lsm-token>"

# Verify document
curl -X POST http://localhost:8000/lsm/providers/42/documents/123 \
  -H "Authorization: Bearer <lsm-token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "verify"}'
```

### **Admin Testing:**
```bash
# Create LSM
curl -X POST http://localhost:8000/admin/lsm/create \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lsm@california.com",
    "password": "password123",
    "firstName": "Mike",
    "lastName": "Johnson",
    "phoneNumber": "+15559876543",
    "region": "California"
  }'

# Get pending service requests
curl -X GET http://localhost:8000/admin/service-requests/pending \
  -H "Authorization: Bearer <admin-token>"

# Approve service request
curl -X POST http://localhost:8000/admin/service-requests/45/approve \
  -H "Authorization: Bearer <admin-token>"

# Ban provider
curl -X POST http://localhost:8000/admin/providers/42/ban \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Poor service quality"}'

# Get all services
curl -X GET http://localhost:8000/admin/services \
  -H "Authorization: Bearer <admin-token>"
```

---

## ✅ **All APIs Created Successfully**

**Total Endpoints:**
- **LSM:** 5 endpoints
- **Admin:** 9 endpoints

**Ready for testing!** 🚀
