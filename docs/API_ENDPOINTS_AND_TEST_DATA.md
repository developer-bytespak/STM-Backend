# 🎯 Complete API Endpoints & Test Data

**Base URL:** `http://localhost:8000`

---

## 📋 Table of Contents
1. [Authentication APIs](#-authentication-apis)
2. [Customer APIs](#-customer-apis)
3. [Provider APIs](#-provider-apis)
4. [Chat APIs](#-chat-apis)
5. [LSM APIs](#-lsm-apis)
6. [Admin APIs](#-admin-apis)
7. [Provider Onboarding APIs](#-provider-onboarding-apis)
8. [Quick Test Workflow](#-quick-test-workflow)

---

## 🔐 Authentication APIs

### 1. Register User
```http
POST http://localhost:8000/auth/register
Content-Type: application/json

{
  "email": "john.customer@test.com",
  "password": "Test123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "john.customer@test.com",
    "firstName": "John",
    "lastName": "Customer",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Other Role Examples:**
```json
// LSM Registration
{
  "email": "lisa.manager@test.com",
  "password": "Test123",
  "firstName": "Lisa",
  "lastName": "Manager",
  "phoneNumber": "+1234567891",
  "role": "LSM",
  "region": "New York"
}

// Admin Registration
{
  "email": "admin@test.com",
  "password": "Test123",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567892",
  "role": "ADMIN"
}

// Provider Registration (Will fail - requires onboarding)
{
  "email": "provider@test.com",
  "password": "Test123",
  "firstName": "Bob",
  "lastName": "Provider",
  "phoneNumber": "+1234567893",
  "role": "PROVIDER"
}
```

---

### 2. Login
```http
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "john.customer@test.com",
  "password": "Test123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "john.customer@test.com",
    "firstName": "John",
    "lastName": "Customer",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. Get Profile
```http
GET http://localhost:8000/auth/profile
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "john.customer@test.com",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "customer",
  "profile_picture": null,
  "is_email_verified": false,
  "created_at": "2025-10-08T00:00:00.000Z",
  "customer": {
    "id": 1,
    "address": "123 Main St",
    "zipcode": "10001"
  }
}
```

---

### 4. Get Me (Simple)
```http
GET http://localhost:8000/auth/me
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "john.customer@test.com",
  "firstName": "John",
  "lastName": "Customer",
  "role": "customer"
}
```

---

### 5. Update Profile
```http
PATCH http://localhost:8000/auth/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Johnny",
  "lastName": "CustomerUpdated",
  "phoneNumber": "+1234567899"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "john.customer@test.com",
    "firstName": "Johnny",
    "lastName": "CustomerUpdated",
    "phoneNumber": "+1234567899"
  }
}
```

---

### 6. Refresh Token
```http
POST http://localhost:8000/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 7. Logout
```http
POST http://localhost:8000/auth/logout
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 🛒 Customer APIs

### 1. Create Job
```http
POST http://localhost:8000/jobs/create
Authorization: Bearer {customerToken}
Content-Type: application/json

{
  "serviceId": 5,
  "providerId": 42,
  "answers": {
    "urgency": "Emergency",
    "toilet_type": "Standard",
    "description": "Toilet is clogged and overflowing"
  },
  "location": "123 Main St, New York, NY",
  "zipcode": "10001",
  "preferredDate": "2025-10-10T14:00:00.000Z"
}
```

**Response (201):**
```json
{
  "job": {
    "id": 123,
    "status": "new",
    "service": {
      "id": 5,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "provider": {
      "id": 42,
      "businessName": "ABC Plumbing"
    },
    "location": "123 Main St, New York, NY",
    "scheduled_at": "2025-10-10T14:00:00.000Z",
    "response_deadline": "2025-10-08T01:00:00.000Z",
    "created_at": "2025-10-08T00:00:00.000Z"
  },
  "chat": {
    "id": "abc-123-uuid",
    "created_at": "2025-10-08T00:00:00.000Z"
  },
  "message": "Job created successfully. Service provider has been notified."
}
```

---

### 2. Get My Jobs
```http
GET http://localhost:8000/customer/jobs
Authorization: Bearer {customerToken}
```

**Response (200):**
```json
[
  {
    "id": 123,
    "status": "in_progress",
    "service": {
      "id": 5,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "provider": {
      "id": 42,
      "businessName": "ABC Plumbing",
      "rating": 4.8,
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+15551234567"
      }
    },
    "location": "123 Main St, New York, NY",
    "scheduled_at": "2025-10-10T14:00:00.000Z",
    "completed_at": null,
    "price": 150.00,
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 3. Reassign Job
```http
POST http://localhost:8000/jobs/123/reassign
Authorization: Bearer {customerToken}
Content-Type: application/json

{
  "newProviderId": 43
}
```

**Response (200):**
```json
{
  "jobId": 123,
  "status": "new",
  "newProviderId": 43,
  "chatId": "new-chat-uuid",
  "message": "Job reassigned successfully"
}
```

---

### 4. Get My Chats
```http
GET http://localhost:8000/customer/chats
Authorization: Bearer {customerToken}
```

**Response (200):**
```json
[
  {
    "id": "abc-123-uuid",
    "job": {
      "id": 123,
      "service": {
        "name": "Toilet Clog",
        "category": "Plumber"
      },
      "status": "in_progress"
    },
    "provider": {
      "id": 42,
      "businessName": "ABC Plumbing",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "profile_picture": null
      }
    },
    "lastMessage": {
      "message": "I'll be there tomorrow at 2 PM",
      "created_at": "2025-10-08T18:00:00.000Z"
    },
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

## 🔧 Provider APIs

### 1. Get Pending Jobs
```http
GET http://localhost:8000/provider/pending-jobs
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
[
  {
    "id": 123,
    "service": {
      "id": 5,
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "customer": {
      "name": "Jane Smith",
      "phone": "+15559876543",
      "email": "jane@test.com"
    },
    "location": "123 Main St, New York, NY",
    "answers": {
      "urgency": "Emergency",
      "toilet_type": "Standard",
      "description": "Toilet is clogged and overflowing"
    },
    "scheduled_at": "2025-10-10T14:00:00.000Z",
    "response_deadline": "2025-10-08T01:00:00.000Z",
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 2. Get My Jobs
```http
GET http://localhost:8000/provider/jobs
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
[
  {
    "id": 123,
    "status": "in_progress",
    "service": {
      "name": "Toilet Clog",
      "category": "Plumber"
    },
    "customer": {
      "name": "Jane Smith",
      "phone": "+15559876543"
    },
    "location": "123 Main St",
    "scheduled_at": "2025-10-10T14:00:00.000Z",
    "price": 150.00,
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 3. Respond to Job (Accept)
```http
POST http://localhost:8000/provider/jobs/123/respond
Authorization: Bearer {providerToken}
Content-Type: application/json

{
  "action": "accept"
}
```

**Response (200):**
```json
{
  "jobId": 123,
  "status": "in_progress",
  "action": "accepted",
  "message": "Job accepted successfully"
}
```

---

### 4. Respond to Job (Reject)
```http
POST http://localhost:8000/provider/jobs/123/respond
Authorization: Bearer {providerToken}
Content-Type: application/json

{
  "action": "reject",
  "reason": "Not available at that time"
}
```

**Response (200):**
```json
{
  "jobId": 123,
  "status": "rejected_by_sp",
  "action": "rejected",
  "reason": "Not available at that time",
  "message": "Job rejected successfully"
}
```

---

### 5. Get My Chats
```http
GET http://localhost:8000/provider/chats
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
[
  {
    "id": "abc-123-uuid",
    "job": {
      "id": 123,
      "service": {
        "name": "Toilet Clog",
        "category": "Plumber"
      },
      "status": "in_progress"
    },
    "customer": {
      "name": "Jane Smith",
      "profilePicture": null
    },
    "lastMessage": {
      "message": "What time can you arrive?",
      "created_at": "2025-10-08T19:10:00.000Z"
    },
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 6. Request New Service
```http
POST http://localhost:8000/provider/request-new-service
Authorization: Bearer {providerToken}
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
      },
      {
        "id": "service_frequency",
        "type": "select",
        "label": "How often do you need service?",
        "options": ["One-time", "Weekly", "Bi-weekly", "Monthly"],
        "required": true
      }
    ]
  }
}
```

**Response (201):**
```json
{
  "id": 45,
  "serviceName": "Pool Cleaning",
  "category": "Exterior Cleaner",
  "status": "pending",
  "lsm_approved": false,
  "admin_approved": false,
  "created_at": "2025-10-08T00:00:00.000Z",
  "message": "Service request submitted successfully. Awaiting LSM approval."
}
```

---

### 7. Get My Service Requests
```http
GET http://localhost:8000/provider/my-service-requests
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
[
  {
    "id": 45,
    "serviceName": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "description": "Professional pool cleaning...",
    "status": "pending",
    "lsm_approved": false,
    "admin_approved": false,
    "lsm_rejection_reason": null,
    "admin_rejection_reason": null,
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 8. Add Existing Service
```http
POST http://localhost:8000/provider/add-service
Authorization: Bearer {providerToken}
Content-Type: application/json

{
  "serviceId": 8
}
```

**Response (200):**
```json
{
  "message": "Service added to your profile successfully",
  "serviceId": 8,
  "serviceName": "Toilet Replacement",
  "category": "Plumber"
}
```

---

## 💬 Chat APIs

### 1. Get Chat Messages
```http
GET http://localhost:8000/chat/abc-123-uuid/messages
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "chatId": "abc-123-uuid",
  "messages": [
    {
      "id": "msg-1",
      "sender_type": "customer",
      "sender_id": 10,
      "message": "📋 New Toilet Clog Request\n\n📍 Location: 123 Main St\n⏰ Scheduled: Oct 10, 2025 2:00 PM\n\n📝 Details:\n- Urgency: Emergency\n- Type: Standard\n\nPlease respond within 1 hour.",
      "message_type": "text",
      "created_at": "2025-10-08T00:00:00.000Z"
    },
    {
      "id": "msg-2",
      "sender_type": "service_provider",
      "sender_id": 42,
      "message": "✅ I have accepted your request. I'll be there on time!",
      "message_type": "text",
      "created_at": "2025-10-08T00:05:00.000Z"
    },
    {
      "id": "msg-3",
      "sender_type": "customer",
      "sender_id": 10,
      "message": "What time can you arrive?",
      "message_type": "text",
      "created_at": "2025-10-08T00:10:00.000Z"
    },
    {
      "id": "msg-4",
      "sender_type": "service_provider",
      "sender_id": 42,
      "message": "I'll be there tomorrow at 2 PM",
      "message_type": "text",
      "created_at": "2025-10-08T18:00:00.000Z"
    }
  ]
}
```

---

### 2. Send Message
```http
POST http://localhost:8000/chat/abc-123-uuid/messages
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "message": "Great! See you tomorrow at 2 PM.",
  "message_type": "text"
}
```

**Response (201):**
```json
{
  "id": "msg-5",
  "sender_type": "customer",
  "sender_id": 10,
  "message": "Great! See you tomorrow at 2 PM.",
  "message_type": "text",
  "created_at": "2025-10-08T18:05:00.000Z"
}
```

---

## 👔 LSM APIs

### 1. Get Pending Service Requests
```http
GET http://localhost:8000/lsm/service-requests/pending
Authorization: Bearer {lsmToken}
```

**Response (200):**
```json
[
  {
    "id": 45,
    "serviceName": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "description": "Professional pool cleaning and maintenance services",
    "provider": {
      "id": 42,
      "businessName": "ABC Services",
      "user": {
        "first_name": "John",
        "last_name": "Provider"
      }
    },
    "questions_json": {
      "questions": [
        {
          "id": "pool_size",
          "type": "select",
          "label": "Pool size",
          "options": ["Small", "Medium", "Large"]
        }
      ]
    },
    "lsm_approved": false,
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 2. Approve Service Request
```http
POST http://localhost:8000/lsm/service-requests/45/approve
Authorization: Bearer {lsmToken}
```

**Response (200):**
```json
{
  "message": "Service request approved successfully. Sent to admin for final approval.",
  "requestId": 45,
  "lsm_approved": true
}
```

---

### 3. Reject Service Request
```http
POST http://localhost:8000/lsm/service-requests/45/reject
Authorization: Bearer {lsmToken}
Content-Type: application/json

{
  "reason": "Service not suitable for this region"
}
```

**Response (200):**
```json
{
  "message": "Service request rejected successfully",
  "requestId": 45,
  "reason": "Service not suitable for this region"
}
```

---

### 4. Get Providers in Region
```http
GET http://localhost:8000/lsm/providers
Authorization: Bearer {lsmToken}
```

**Response (200):**
```json
[
  {
    "id": 42,
    "businessName": "ABC Plumbing",
    "status": "active",
    "rating": 4.8,
    "total_jobs": 156,
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@abc.com",
      "phone_number": "+15551234567"
    },
    "location": "New York, NY",
    "zipcode": "10001",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 5. Verify/Reject Provider Document
```http
POST http://localhost:8000/lsm/providers/42/documents/5
Authorization: Bearer {lsmToken}
Content-Type: application/json

// To verify
{
  "action": "verify"
}

// To reject
{
  "action": "reject",
  "reason": "Document is not clear, please reupload"
}
```

**Response (200):**
```json
{
  "message": "Document verified successfully",
  "documentId": 5,
  "status": "verified"
}
```

---

## 👨‍💼 Admin APIs

### 1. Get All LSMs
```http
GET http://localhost:8000/admin/lsms
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Lisa Manager",
    "email": "lsm.newyork@stm.com",
    "phoneNumber": "+11234567891",
    "region": "New York",
    "status": "active",
    "providerCount": 45,
    "closedDealsCount": 0,
    "earnings": 0,
    "lastLogin": "2025-10-08T10:00:00.000Z",
    "createdAt": "2025-10-08T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Bob Manager",
    "email": "lsm.la@stm.com",
    "phoneNumber": "+11234567894",
    "region": "Los Angeles",
    "status": "active",
    "providerCount": 38,
    "closedDealsCount": 0,
    "earnings": 0,
    "lastLogin": "2025-10-07T15:00:00.000Z",
    "createdAt": "2025-10-07T00:00:00.000Z"
  }
]
```

---

### 2. Get LSM Details by ID
```http
GET http://localhost:8000/admin/lsms/1
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Lisa Manager",
  "email": "lsm.newyork@stm.com",
  "phoneNumber": "+11234567891",
  "region": "New York",
  "status": "active",
  "providerCount": 45,
  "totalJobs": 234,
  "closedDealsCount": 0,
  "earnings": 0,
  "serviceRequestsReviewed": 67,
  "documentsVerified": 123,
  "lastLogin": "2025-10-08T10:00:00.000Z",
  "createdAt": "2025-10-08T00:00:00.000Z",
  "updatedAt": "2025-10-08T10:00:00.000Z",
  "providers": [
    {
      "id": 1,
      "businessName": "ABC Plumbing Services",
      "status": "active",
      "rating": 4.8,
      "totalJobs": 156,
      "user": {
        "first_name": "John",
        "last_name": "Plumber",
        "email": "john.plumber@stm.com"
      }
    }
  ]
}
```

---

### 3. Get Pending Service Requests (LSM-Approved)
```http
GET http://localhost:8000/admin/service-requests/pending
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
[
  {
    "id": 45,
    "serviceName": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "description": "Professional pool cleaning and maintenance",
    "provider": {
      "id": 42,
      "businessName": "ABC Services"
    },
    "lsm_approved": true,
    "admin_approved": false,
    "lsm_reviewed_by": 10,
    "lsm_reviewed_at": "2025-10-08T10:00:00.000Z",
    "created_at": "2025-10-08T00:00:00.000Z"
  }
]
```

---

### 2. Approve Service Request (Creates Service)
```http
POST http://localhost:8000/admin/service-requests/45/approve
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
{
  "message": "Service request approved and service created successfully",
  "requestId": 45,
  "service": {
    "id": 20,
    "name": "Pool Cleaning",
    "category": "Exterior Cleaner",
    "status": "approved",
    "created_at": "2025-10-08T12:00:00.000Z"
  }
}
```

---

### 3. Reject Service Request
```http
POST http://localhost:8000/admin/service-requests/45/reject
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "reason": "Service already exists with similar name"
}
```

**Response (200):**
```json
{
  "message": "Service request rejected",
  "requestId": 45,
  "reason": "Service already exists with similar name"
}
```

---

### 4. Get All Services
```http
GET http://localhost:8000/admin/services
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
[
  {
    "id": 5,
    "name": "Toilet Clog",
    "category": "Plumber",
    "description": "Professional toilet unclogging service",
    "status": "approved",
    "is_popular": true,
    "activeJobs": 12,
    "totalProviders": 45,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 5. Update Service
```http
PUT http://localhost:8000/admin/services/5
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "name": "Toilet Repair & Unclogging",
  "description": "Professional toilet repair and unclogging services",
  "is_popular": true
}
```

**Response (200):**
```json
{
  "message": "Service updated successfully",
  "service": {
    "id": 5,
    "name": "Toilet Repair & Unclogging",
    "description": "Professional toilet repair and unclogging services",
    "is_popular": true
  }
}
```

---

### 6. Delete Service (Soft Delete)
```http
DELETE http://localhost:8000/admin/services/5
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
{
  "message": "Service deactivated successfully",
  "serviceId": 5
}
```

**Error (400):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete service with 12 active jobs",
  "error": "Bad Request"
}
```

---

### 7. Create LSM
```http
POST http://localhost:8000/admin/lsm/create
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "email": "newlsm@test.com",
  "password": "LSM12345",
  "firstName": "New",
  "lastName": "LSM",
  "phoneNumber": "+1234567894",
  "region": "Los Angeles"
}
```

**Response (201):**
```json
{
  "message": "LSM created successfully",
  "user": {
    "id": 15,
    "email": "newlsm@test.com",
    "role": "local_service_manager"
  },
  "lsm": {
    "id": 5,
    "region": "Los Angeles",
    "status": "active"
  }
}
```

---

### 8. Ban Provider
```http
POST http://localhost:8000/admin/providers/42/ban
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "reason": "Multiple customer complaints",
  "duration": "permanent"
}
```

**Response (200):**
```json
{
  "message": "Provider banned successfully",
  "providerId": 42,
  "status": "banned"
}
```

**Error (400):**
```json
{
  "statusCode": 400,
  "message": "Cannot ban provider with 5 active jobs",
  "error": "Bad Request"
}
```

---

### 9. Unban Provider
```http
POST http://localhost:8000/admin/providers/42/unban
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
{
  "message": "Provider unbanned successfully",
  "providerId": 42,
  "status": "active"
}
```

---

### 10. Get All Providers
```http
GET http://localhost:8000/admin/providers?status=active&page=1&limit=20
Authorization: Bearer {adminToken}
```

**Query Parameters:**
- `search` - Search by business name, owner name, or email
- `region` - Filter by region
- `status` - Filter by status (pending, active, inactive, banned)
- `minRating` - Minimum rating (0-5)
- `maxRating` - Maximum rating (0-5)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field (default: created_at)
- `sortOrder` - asc or desc (default: desc)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "businessName": "ABC Plumbing Services",
      "owner": {
        "id": 3,
        "name": "John Plumber",
        "email": "john.plumber@stm.com",
        "phoneNumber": "+11234567892"
      },
      "status": "active",
      "rating": 4.8,
      "location": "New York, NY",
      "zipcode": "10001",
      "experience": 5,
      "tier": "Gold",
      "totalJobs": 156,
      "activeServices": 3,
      "documentsCount": 2,
      "lsm": {
        "id": 1,
        "name": "Lisa Manager",
        "region": "New York"
      },
      "earnings": 45678.50,
      "warnings": 0,
      "lastLogin": "2025-10-08T10:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 11. Get Provider Details
```http
GET http://localhost:8000/admin/providers/1
Authorization: Bearer {adminToken}
```

**Response (200):**
```json
{
  "id": 1,
  "businessName": "ABC Plumbing Services",
  "owner": {
    "id": 3,
    "name": "John Plumber",
    "email": "john.plumber@stm.com",
    "isEmailVerified": true,
    "lastLogin": "2025-10-08T10:00:00.000Z"
  },
  "status": "active",
  "rating": 4.8,
  "location": "New York, NY",
  "statistics": {
    "totalJobs": 156,
    "completedJobs": 145,
    "activeJobs": 3,
    "totalRevenue": 45678.50,
    "averageRating": 4.8
  },
  "services": [
    {"id": 1, "name": "Toilet Clog", "category": "Plumber"}
  ],
  "documents": [
    {"id": 1, "fileName": "business_license.pdf", "status": "verified"}
  ],
  "recentJobs": [
    {"id": 156, "status": "completed", "service": "Toilet Clog", "price": 150.00}
  ],
  "recentReviews": [
    {"id": 145, "rating": 5, "feedback": "Excellent service!"}
  ]
}
```

---

## 📄 Provider Onboarding APIs

### 1. Upload Document
```http
POST http://localhost:8000/provider-onboarding/documents/upload
Authorization: Bearer {providerToken}
Content-Type: multipart/form-data

file: [Binary file data]
description: "Business License"
```

**Response (201):**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": 5,
    "file_name": "business_license.pdf",
    "file_type": "application/pdf",
    "file_size": 245678,
    "description": "Business License",
    "status": "pending",
    "created_at": "2025-10-08T00:00:00.000Z"
  }
}
```

---

### 2. Get My Documents
```http
GET http://localhost:8000/provider-onboarding/documents
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
[
  {
    "id": 5,
    "file_name": "business_license.pdf",
    "file_type": "application/pdf",
    "file_size": 245678,
    "description": "Business License",
    "status": "verified",
    "verified_by": 10,
    "verified_at": "2025-10-08T10:00:00.000Z",
    "created_at": "2025-10-08T00:00:00.000Z"
  },
  {
    "id": 6,
    "file_name": "insurance.pdf",
    "file_type": "application/pdf",
    "file_size": 189234,
    "description": "Insurance Certificate",
    "status": "pending",
    "verified_by": null,
    "verified_at": null,
    "created_at": "2025-10-08T02:00:00.000Z"
  }
]
```

---

### 3. Delete Document
```http
DELETE http://localhost:8000/provider-onboarding/documents/5
Authorization: Bearer {providerToken}
```

**Response (200):**
```json
{
  "message": "Document deleted successfully",
  "documentId": 5
}
```

---

## 🚀 Quick Test Workflow

### Step 1: Register Users
```bash
# 1. Register Customer
POST http://localhost:8000/auth/register
{
  "email": "customer@test.com",
  "password": "Test123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
# Save accessToken as customerToken

# 2. Register LSM
POST http://localhost:8000/auth/register
{
  "email": "lsm@test.com",
  "password": "Test123",
  "firstName": "Lisa",
  "lastName": "Manager",
  "phoneNumber": "+1234567891",
  "role": "LSM",
  "region": "New York"
}
# Save accessToken as lsmToken

# 3. Register Admin
POST http://localhost:8000/auth/register
{
  "email": "admin@test.com",
  "password": "Test123",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567892",
  "role": "ADMIN"
}
# Save accessToken as adminToken
```

---

### Step 2: Test Customer Flow
```bash
# 1. Customer creates a job
POST http://localhost:8000/jobs/create
Authorization: Bearer {customerToken}
{
  "serviceId": 5,
  "providerId": 42,
  "answers": {"urgency": "Emergency"},
  "location": "123 Main St",
  "zipcode": "10001",
  "preferredDate": "2025-10-10T14:00:00.000Z"
}

# 2. Customer views jobs
GET http://localhost:8000/customer/jobs
Authorization: Bearer {customerToken}

# 3. Customer views chats
GET http://localhost:8000/customer/chats
Authorization: Bearer {customerToken}
```

---

### Step 3: Test Provider Flow
```bash
# 1. Provider views pending jobs
GET http://localhost:8000/provider/pending-jobs
Authorization: Bearer {providerToken}

# 2. Provider accepts job
POST http://localhost:8000/provider/jobs/123/respond
Authorization: Bearer {providerToken}
{"action": "accept"}

# 3. Provider requests new service
POST http://localhost:8000/provider/request-new-service
Authorization: Bearer {providerToken}
{
  "serviceName": "Pool Cleaning",
  "category": "Exterior Cleaner",
  "description": "Pool cleaning service"
}
```

---

### Step 4: Test LSM Flow
```bash
# 1. LSM views pending service requests
GET http://localhost:8000/lsm/service-requests/pending
Authorization: Bearer {lsmToken}

# 2. LSM approves request
POST http://localhost:8000/lsm/service-requests/45/approve
Authorization: Bearer {lsmToken}

# 3. LSM views providers in region
GET http://localhost:8000/lsm/providers
Authorization: Bearer {lsmToken}
```

---

### Step 5: Test Admin Flow
```bash
# 1. Admin views pending requests
GET http://localhost:8000/admin/service-requests/pending
Authorization: Bearer {adminToken}

# 2. Admin approves and creates service
POST http://localhost:8000/admin/service-requests/45/approve
Authorization: Bearer {adminToken}

# 3. Admin views all services
GET http://localhost:8000/admin/services
Authorization: Bearer {adminToken}

# 4. Admin creates LSM
POST http://localhost:8000/admin/lsm/create
Authorization: Bearer {adminToken}
{
  "email": "newlsm@test.com",
  "password": "LSM12345",
  "firstName": "New",
  "lastName": "LSM",
  "phoneNumber": "+1234567894",
  "region": "Los Angeles"
}
```

---

## 🎯 Role-Based Access Matrix

| Endpoint | Customer | Provider | LSM | Admin |
|----------|----------|----------|-----|-------|
| `POST /auth/register` | ✅ | ❌* | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/profile` | ✅ | ✅ | ✅ | ✅ |
| `POST /jobs/create` | ✅ | ❌ | ❌ | ✅ |
| `GET /customer/jobs` | ✅ | ❌ | ❌ | ✅ |
| `POST /jobs/:id/reassign` | ✅ | ❌ | ❌ | ✅ |
| `GET /provider/pending-jobs` | ❌ | ✅ | ❌ | ✅ |
| `POST /provider/jobs/:id/respond` | ❌ | ✅ | ❌ | ✅ |
| `GET /provider/jobs` | ❌ | ✅ | ❌ | ✅ |
| `POST /provider/request-new-service` | ❌ | ✅ | ❌ | ✅ |
| `GET /customer/chats` | ✅ | ❌ | ❌ | ✅ |
| `GET /provider/chats` | ❌ | ✅ | ❌ | ✅ |
| `GET /chat/:id/messages` | ✅ | ✅ | ✅ | ✅ |
| `POST /chat/:id/messages` | ✅ | ✅ | ✅ | ✅ |
| `GET /lsm/service-requests/pending` | ❌ | ❌ | ✅ | ✅ |
| `POST /lsm/service-requests/:id/approve` | ❌ | ❌ | ✅ | ✅ |
| `GET /lsm/providers` | ❌ | ❌ | ✅ | ✅ |
| `GET /admin/lsms` | ❌ | ❌ | ❌ | ✅ |
| `GET /admin/lsms/:id` | ❌ | ❌ | ❌ | ✅ |
| `GET /admin/providers` | ❌ | ❌ | ❌ | ✅ |
| `GET /admin/providers/:id` | ❌ | ❌ | ❌ | ✅ |
| `GET /admin/service-requests/pending` | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/service-requests/:id/approve` | ❌ | ❌ | ❌ | ✅ |
| `GET /admin/services` | ❌ | ❌ | ❌ | ✅ |
| `PUT /admin/services/:id` | ❌ | ❌ | ❌ | ✅ |
| `DELETE /admin/services/:id` | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/lsm/create` | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/providers/:id/ban` | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/providers/:id/unban` | ❌ | ❌ | ❌ | ✅ |
| `POST /provider-onboarding/documents/upload` | ❌ | ✅ | ❌ | ✅ |

*Provider registration requires special onboarding process

---

## 📝 Notes

1. **Base URL:** All endpoints use `http://localhost:8000` as the base URL
2. **Authentication:** Most endpoints require `Authorization: Bearer {token}` header
3. **Content-Type:** Use `application/json` for JSON requests
4. **Admin Bypass:** Admins can access ALL endpoints regardless of role restrictions
5. **Provider Registration:** Providers cannot register directly; they need LSM assignment
6. **Token Expiry:** Access tokens expire after 15 minutes, use refresh token to get new ones
7. **Refresh Token Rotation:** Each refresh generates new access AND refresh tokens

---

## 🎉 Happy Testing!

For more details, see:
- `TESTING_GUIDE.md` - Complete testing guide
- `QUICK_TEST_COMMANDS.md` - Quick copy-paste commands
- `COMPLETE_API_SUMMARY.md` - API implementation summary

