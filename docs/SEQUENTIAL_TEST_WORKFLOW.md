# 🔄 Sequential Test Workflow - Complete Setup Guide

**Base URL:** `http://localhost:8000`

Follow this exact sequence to set up and test your STM Backend from scratch.

---

## 📋 Prerequisites

1. ✅ Database is running
2. ✅ Prisma migrations applied: `npx prisma migrate dev`
3. ✅ Server is running: `npm run dev`
4. ✅ Server is listening on `http://localhost:8000`

---

## 🎯 Complete Workflow Sequence

### STEP 1: Create Admin Account
### STEP 2: Admin Creates LSM
### STEP 3: Service Provider Signup (Onboarding)
### STEP 4: LSM Approves Provider Documents
### STEP 5: Seed/Create Services
### STEP 6: Provider Adds Services to Profile
### STEP 7: Customer Registers
### STEP 8: Customer Books Job
### STEP 9: Provider Responds to Job
### STEP 10: Chat Communication

---

## STEP 1️⃣: Create Admin Account

### 1.1 Register Admin
```http
POST http://localhost:8000/auth/register
Content-Type: application/json

{
  "email": "admin@stm.com",
  "password": "Admin123!",
  "firstName": "Super",
  "lastName": "Admin",
  "phoneNumber": "+11234567890",
  "role": "ADMIN"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "admin@stm.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**📝 Save this token as `ADMIN_TOKEN`**

---

## STEP 2️⃣: Admin Creates LSM

### 2.1 Create LSM for New York Region
```http
POST http://localhost:8000/admin/lsm/create
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json

{
  "email": "lsm.newyork@stm.com",
  "password": "LSM123!",
  "firstName": "Lisa",
  "lastName": "Manager",
  "phoneNumber": "+11234567891",
  "region": "New York"
}
```

**Expected Response (201):**
```json
{
  "message": "LSM created successfully",
  "user": {
    "id": 2,
    "email": "lsm.newyork@stm.com",
    "role": "local_service_manager"
  },
  "lsm": {
    "id": 1,
    "region": "New York",
    "status": "active"
  }
}
```

### 2.2 Login as LSM (to get LSM token)
```http
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "lsm.newyork@stm.com",
  "password": "LSM123!"
}
```

**Expected Response (200):**
```json
{
  "user": {
    "id": 2,
    "email": "lsm.newyork@stm.com",
    "role": "local_service_manager"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**📝 Save this token as `LSM_TOKEN`**

---

## STEP 3️⃣: Service Provider Signup (Onboarding)

### 3.1 Create Provider Account via Database/Admin

Since providers need LSM assignment, you need to create them properly. First, let's check if there's a provider onboarding endpoint or we need to use direct database insertion.

**For now, let's manually insert a provider into the database:**

```sql
-- First, create user
INSERT INTO users (first_name, last_name, email, phone_number, role, password, created_at, updated_at)
VALUES ('John', 'Plumber', 'john.plumber@stm.com', '+11234567892', 'service_provider', '$2b$10$YourHashedPasswordHere', NOW(), NOW());
-- Note the user_id returned (let's say it's 3)

-- Then, create service provider profile
INSERT INTO service_providers (user_id, business_name, experience, location, zipcode, lsm_id, status, created_at, updated_at)
VALUES (3, 'ABC Plumbing Services', 5, 'New York, NY', '10001', 1, 'pending', NOW(), NOW());
-- Note the provider_id returned (let's say it's 1)
```

**OR** - If you have a seed script, run:
```bash
npm run seed
```

### 3.2 Login as Provider
```http
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "john.plumber@stm.com",
  "password": "Provider123!"
}
```

**Expected Response (200):**
```json
{
  "user": {
    "id": 3,
    "email": "john.plumber@stm.com",
    "role": "service_provider"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**📝 Save this token as `PROVIDER_TOKEN`**

---

### 3.3 Provider Uploads Documents

#### Upload Business License
```http
POST http://localhost:8000/provider-onboarding/documents/upload
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: multipart/form-data

file: [Select a PDF file]
description: Business License
```

**Expected Response (201):**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": 1,
    "file_name": "business_license.pdf",
    "file_type": "application/pdf",
    "file_size": 245678,
    "description": "Business License",
    "status": "pending",
    "created_at": "2025-10-08T00:00:00.000Z"
  }
}
```

**📝 Save document ID as `DOC_ID_1`**

#### Upload Insurance Certificate
```http
POST http://localhost:8000/provider-onboarding/documents/upload
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: multipart/form-data

file: [Select a PDF file]
description: Insurance Certificate
```

**Expected Response (201):**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": 2,
    "file_name": "insurance.pdf",
    "file_type": "application/pdf",
    "file_size": 189234,
    "description": "Insurance Certificate",
    "status": "pending",
    "created_at": "2025-10-08T00:00:00.000Z"
  }
}
```

**📝 Save document ID as `DOC_ID_2`**

#### View My Documents
```http
GET http://localhost:8000/provider-onboarding/documents
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "file_name": "business_license.pdf",
    "status": "pending",
    "description": "Business License"
  },
  {
    "id": 2,
    "file_name": "insurance.pdf",
    "status": "pending",
    "description": "Insurance Certificate"
  }
]
```

---

## STEP 4️⃣: LSM Approves Provider Documents

### 4.1 LSM Views Providers in Region
```http
GET http://localhost:8000/lsm/providers
Authorization: Bearer {LSM_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "businessName": "ABC Plumbing Services",
    "status": "pending",
    "user": {
      "id": 3,
      "first_name": "John",
      "last_name": "Plumber",
      "email": "john.plumber@stm.com",
      "phone_number": "+11234567892"
    },
    "location": "New York, NY",
    "zipcode": "10001"
  }
]
```

**📝 Save provider ID as `PROVIDER_ID` (e.g., 1)**

### 4.2 LSM Verifies Business License
```http
POST http://localhost:8000/lsm/providers/1/documents/1
Authorization: Bearer {LSM_TOKEN}
Content-Type: application/json

{
  "action": "verify"
}
```

**Expected Response (200):**
```json
{
  "message": "Document verified successfully",
  "documentId": 1,
  "status": "verified"
}
```

### 4.3 LSM Verifies Insurance Certificate
```http
POST http://localhost:8000/lsm/providers/1/documents/2
Authorization: Bearer {LSM_TOKEN}
Content-Type: application/json

{
  "action": "verify"
}
```

**Expected Response (200):**
```json
{
  "message": "Document verified successfully",
  "documentId": 2,
  "status": "verified"
}
```

### 4.4 Update Provider Status to Active (Database)

After documents are verified, update provider status:

```sql
UPDATE service_providers 
SET status = 'active', approved_at = NOW() 
WHERE id = 1;
```

---

## STEP 5️⃣: Seed/Create Services

### 5.1 Method 1: Run Seed Script (Recommended)

```bash
npx ts-node prisma/seed-services.ts
```

This will create pre-defined services like:
- Toilet Clog
- Sink Repair
- Pipe Installation
- etc.

### 5.2 Method 2: Admin Creates Service Manually

```http
-- You would need an admin endpoint to create services directly
-- Or insert via database:
```

```sql
INSERT INTO services (name, description, category, questions_json, status, is_popular, created_at, updated_at)
VALUES 
('Toilet Clog', 'Professional toilet unclogging service', 'Plumber', 
'{"questions":[{"id":"urgency","type":"select","label":"Urgency Level","options":["Regular","Emergency"],"required":true},{"id":"toilet_type","type":"select","label":"Toilet Type","options":["Standard","Wall-mounted","Smart toilet"],"required":true}]}', 
'approved', true, NOW(), NOW()),

('Sink Repair', 'Kitchen and bathroom sink repair', 'Plumber',
'{"questions":[{"id":"sink_location","type":"select","label":"Sink Location","options":["Kitchen","Bathroom","Utility room"],"required":true},{"id":"issue_type","type":"select","label":"Issue Type","options":["Leak","Clog","Broken fixture"],"required":true}]}',
'approved', true, NOW(), NOW()),

('Pipe Installation', 'New pipe installation service', 'Plumber',
'{"questions":[{"id":"pipe_type","type":"select","label":"Pipe Type","options":["PVC","Copper","PEX"],"required":true},{"id":"length","type":"text","label":"Approximate Length (feet)","required":true}]}',
'approved', false, NOW(), NOW());
```

### 5.3 Verify Services Were Created

```http
GET http://localhost:8000/admin/services
Authorization: Bearer {ADMIN_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "name": "Toilet Clog",
    "category": "Plumber",
    "description": "Professional toilet unclogging service",
    "status": "approved",
    "is_popular": true
  },
  {
    "id": 2,
    "name": "Sink Repair",
    "category": "Plumber",
    "description": "Kitchen and bathroom sink repair",
    "status": "approved",
    "is_popular": true
  },
  {
    "id": 3,
    "name": "Pipe Installation",
    "category": "Plumber",
    "description": "New pipe installation service",
    "status": "approved",
    "is_popular": false
  }
]
```

**📝 Save service IDs (e.g., SERVICE_ID = 1)**

---

## STEP 6️⃣: Provider Adds Services to Profile

### 6.1 Provider Adds Toilet Clog Service
```http
POST http://localhost:8000/provider/add-service
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "serviceId": 1
}
```

**Expected Response (200):**
```json
{
  "message": "Service added to your profile successfully",
  "serviceId": 1,
  "serviceName": "Toilet Clog",
  "category": "Plumber"
}
```

### 6.2 Provider Adds Sink Repair Service
```http
POST http://localhost:8000/provider/add-service
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "serviceId": 2
}
```

**Expected Response (200):**
```json
{
  "message": "Service added to your profile successfully",
  "serviceId": 2,
  "serviceName": "Sink Repair",
  "category": "Plumber"
}
```

### 6.3 Provider Adds Pipe Installation Service
```http
POST http://localhost:8000/provider/add-service
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "serviceId": 3
}
```

**Expected Response (200):**
```json
{
  "message": "Service added to your profile successfully",
  "serviceId": 3,
  "serviceName": "Pipe Installation",
  "category": "Plumber"
}
```

---

## 📋 ALL SERVICE PROVIDER APIs

### 6.4 View Pending Jobs
```http
GET http://localhost:8000/provider/pending-jobs
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[]
```
*(Empty initially, will have jobs after customer creates them)*

### 6.5 View Active Jobs
```http
GET http://localhost:8000/provider/jobs
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[]
```
*(Empty initially)*

### 6.6 View My Service Requests
```http
GET http://localhost:8000/provider/my-service-requests
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[]
```

### 6.7 Request New Service
```http
POST http://localhost:8000/provider/request-new-service
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "serviceName": "Pool Cleaning",
  "category": "Exterior Cleaner",
  "description": "Professional pool cleaning and maintenance services",
  "suggestedQuestions": {
    "questions": [
      {
        "id": "pool_size",
        "type": "select",
        "label": "Pool size",
        "options": ["Small (under 15ft)", "Medium (15-25ft)", "Large (over 25ft)"],
        "required": true
      },
      {
        "id": "pool_type",
        "type": "select",
        "label": "Pool type",
        "options": ["Above ground", "In-ground", "Infinity"],
        "required": true
      }
    ]
  }
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "serviceName": "Pool Cleaning",
  "category": "Exterior Cleaner",
  "status": "pending",
  "lsm_approved": false,
  "admin_approved": false,
  "message": "Service request submitted successfully. Awaiting LSM approval."
}
```

**📝 Save request ID as `SERVICE_REQUEST_ID`**

### 6.8 View My Chats
```http
GET http://localhost:8000/provider/chats
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[]
```
*(Empty initially)*

---

## STEP 7️⃣: Customer Registration

### 7.1 Register Customer
```http
POST http://localhost:8000/auth/register
Content-Type: application/json

{
  "email": "customer@stm.com",
  "password": "Customer123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+11234567893",
  "role": "CUSTOMER"
}
```

**Expected Response (201):**
```json
{
  "user": {
    "id": 4,
    "email": "customer@stm.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**📝 Save this token as `CUSTOMER_TOKEN`**

### 7.2 Update Customer Profile (Add Address)

Since customers need address/zipcode, update the customer record:

```sql
UPDATE customers 
SET address = '123 Main St, New York, NY', 
    zipcode = '10001' 
WHERE user_id = 4;
```

---

## STEP 8️⃣: Customer Books Job

### 8.1 Create Job for Toilet Clog
```http
POST http://localhost:8000/jobs/create
Authorization: Bearer {CUSTOMER_TOKEN}
Content-Type: application/json

{
  "serviceId": 1,
  "providerId": 1,
  "answers": {
    "urgency": "Emergency",
    "toilet_type": "Standard",
    "description": "Toilet is clogged and overflowing"
  },
  "location": "123 Main St, New York, NY",
  "zipcode": "10001",
  "preferredDate": "2025-10-15T14:00:00.000Z"
}
```

**Expected Response (201):**
```json
{
  "job": {
    "id": 1,
    "status": "new",
    "service": {
      "id": 1,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "provider": {
      "id": 1,
      "businessName": "ABC Plumbing Services"
    },
    "location": "123 Main St, New York, NY",
    "scheduled_at": "2025-10-15T14:00:00.000Z",
    "response_deadline": "2025-10-08T01:00:00.000Z",
    "created_at": "2025-10-08T00:00:00.000Z"
  },
  "chat": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-10-08T00:00:00.000Z"
  },
  "message": "Job created successfully. Service provider has been notified."
}
```

**📝 Save JOB_ID = 1 and CHAT_ID**

### 8.2 View My Jobs
```http
GET http://localhost:8000/customer/jobs
Authorization: Bearer {CUSTOMER_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "status": "new",
    "service": {
      "id": 1,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "provider": {
      "id": 1,
      "businessName": "ABC Plumbing Services",
      "rating": 0.0
    },
    "location": "123 Main St, New York, NY",
    "scheduled_at": "2025-10-15T14:00:00.000Z",
    "price": 0.00,
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

### 8.3 View My Chats
```http
GET http://localhost:8000/customer/chats
Authorization: Bearer {CUSTOMER_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job": {
      "id": 1,
      "service": {
        "name": "Toilet Clog",
        "category": "Plumber"
      },
      "status": "new"
    },
    "provider": {
      "id": 1,
      "businessName": "ABC Plumbing Services",
      "user": {
        "first_name": "John",
        "last_name": "Plumber"
      }
    },
    "lastMessage": {
      "message": "📋 New Toilet Clog Request...",
      "created_at": "2025-10-08T00:00:00.000Z"
    }
  }
]
```

---

## STEP 9️⃣: Provider Responds to Job

### 9.1 Provider Views Pending Jobs
```http
GET http://localhost:8000/provider/pending-jobs
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "service": {
      "id": 1,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "customer": {
      "name": "Jane Smith",
      "phone": "+11234567893",
      "email": "customer@stm.com"
    },
    "location": "123 Main St, New York, NY",
    "answers": {
      "urgency": "Emergency",
      "toilet_type": "Standard",
      "description": "Toilet is clogged and overflowing"
    },
    "scheduled_at": "2025-10-15T14:00:00.000Z",
    "response_deadline": "2025-10-08T01:00:00.000Z"
  }
]
```

### 9.2 Provider Accepts Job
```http
POST http://localhost:8000/provider/jobs/1/respond
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "action": "accept"
}
```

**Expected Response (200):**
```json
{
  "jobId": 1,
  "status": "in_progress",
  "action": "accepted",
  "message": "Job accepted successfully"
}
```

### 9.3 Provider Views Active Jobs
```http
GET http://localhost:8000/provider/jobs
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "status": "in_progress",
    "service": {
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "customer": {
      "name": "Jane Smith",
      "phone": "+11234567893"
    },
    "location": "123 Main St, New York, NY",
    "scheduled_at": "2025-10-15T14:00:00.000Z"
  }
]
```

---

## STEP 🔟: Chat Communication

### 10.1 Customer Sends Message
```http
POST http://localhost:8000/chat/550e8400-e29b-41d4-a716-446655440000/messages
Authorization: Bearer {CUSTOMER_TOKEN}
Content-Type: application/json

{
  "message": "What time will you arrive?",
  "message_type": "text"
}
```

**Expected Response (201):**
```json
{
  "id": "msg-uuid-123",
  "sender_type": "customer",
  "message": "What time will you arrive?",
  "message_type": "text",
  "created_at": "2025-10-08T10:00:00.000Z"
}
```

### 10.2 Provider Views Chat Messages
```http
GET http://localhost:8000/chat/550e8400-e29b-41d4-a716-446655440000/messages
Authorization: Bearer {PROVIDER_TOKEN}
```

**Expected Response (200):**
```json
{
  "chatId": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "id": "msg-1",
      "sender_type": "customer",
      "message": "📋 New Toilet Clog Request...",
      "created_at": "2025-10-08T00:00:00.000Z"
    },
    {
      "id": "msg-2",
      "sender_type": "service_provider",
      "message": "✅ I have accepted your request...",
      "created_at": "2025-10-08T00:05:00.000Z"
    },
    {
      "id": "msg-3",
      "sender_type": "customer",
      "message": "What time will you arrive?",
      "created_at": "2025-10-08T10:00:00.000Z"
    }
  ]
}
```

### 10.3 Provider Sends Reply
```http
POST http://localhost:8000/chat/550e8400-e29b-41d4-a716-446655440000/messages
Authorization: Bearer {PROVIDER_TOKEN}
Content-Type: application/json

{
  "message": "I'll be there at 2:00 PM tomorrow",
  "message_type": "text"
}
```

**Expected Response (201):**
```json
{
  "id": "msg-uuid-456",
  "sender_type": "service_provider",
  "message": "I'll be there at 2:00 PM tomorrow",
  "message_type": "text",
  "created_at": "2025-10-08T10:05:00.000Z"
}
```

---

## 🎯 Quick Reference: Entity IDs

After following all steps, you should have:

| Entity | ID | Token Variable | Notes |
|--------|----|--------------|----|
| Admin User | 1 | ADMIN_TOKEN | Super admin |
| LSM User | 2 | LSM_TOKEN | New York region |
| Provider User | 3 | PROVIDER_TOKEN | ABC Plumbing |
| Customer User | 4 | CUSTOMER_TOKEN | Jane Smith |
| LSM Profile | 1 | - | Region: New York |
| Provider Profile | 1 | PROVIDER_ID | Active, verified |
| Customer Profile | 1 | - | 10001 zipcode |
| Service (Toilet Clog) | 1 | SERVICE_ID | Approved |
| Service (Sink Repair) | 2 | - | Approved |
| Service (Pipe Install) | 3 | - | Approved |
| Job | 1 | JOB_ID | Status: in_progress |
| Chat | UUID | CHAT_ID | Active |

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Admin can login
- [ ] LSM can login and view region providers
- [ ] Provider can login and is ACTIVE status
- [ ] Provider has 3 services in profile
- [ ] Customer can login
- [ ] Customer created job successfully
- [ ] Provider received job notification
- [ ] Provider accepted job
- [ ] Job status is "in_progress"
- [ ] Chat is active and messages work both ways
- [ ] Provider can view active jobs
- [ ] Customer can view their jobs

---

## 🔧 Troubleshooting

### Error: "Service provider not available"

**Cause:** Provider status is not 'active' or provider doesn't offer the service

**Solution:**
```sql
-- Check provider status
SELECT id, status FROM service_providers WHERE id = 1;

-- Update to active if needed
UPDATE service_providers SET status = 'active' WHERE id = 1;

-- Check if provider has the service
SELECT * FROM provider_services WHERE provider_id = 1 AND service_id = 1;

-- Add service if missing
INSERT INTO provider_services (provider_id, service_id, is_active, created_at)
VALUES (1, 1, true, NOW());
```

### Error: "Customer not found"

**Solution:**
```sql
-- Check if customer profile exists
SELECT * FROM customers WHERE user_id = 4;

-- Create if missing
INSERT INTO customers (user_id, address, zipcode, created_at)
VALUES (4, '123 Main St, New York, NY', '10001', NOW());
```

### Error: "Service not found"

**Solution:**
```bash
# Run seed script
npx ts-node prisma/seed-services.ts

# Or insert manually via SQL (see Step 5)
```

---

## 🎉 Success!

You now have a fully functioning STM Backend with:
- ✅ Admin managing the platform
- ✅ LSM managing New York region
- ✅ Active service provider offering 3 services
- ✅ Customer who booked a job
- ✅ Active job in progress
- ✅ Working chat system

**Next Steps:**
- Test job reassignment
- Test provider rejection
- Test service request approval workflow
- Add more providers and customers
- Test LSM document verification
- Test admin service management

---

## 📝 Summary

This complete workflow ensures everything is set up correctly before testing. Follow the sequence exactly, and you'll have a working system ready for comprehensive testing!

