# 🧪 Complete Testing Guide - Authentication & RBAC

## ✅ What You Can Test Now

I've created complete, working code for you to test:

1. **Authentication Endpoints** (`/auth/*`)
2. **RBAC Job Endpoints** (`/jobs/*`) - With different role permissions
3. **All 4 roles** - Customer, Provider, LSM, Admin

---

## 🚀 Step-by-Step Testing Guide

### Prerequisites
1. ✅ Database is running
2. ✅ Server is running: `npm run start:dev`
3. ✅ `.env` file has `JWT_SECRET` set

---

## 📝 Test Scenario 1: Customer Flow

### Step 1: Register as Customer
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Customer123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```

**✅ Expected Response:**
```json
{
  "user": {
    "id": 1,
    "email": "customer@test.com",
    "firstName": "John",
    "lastName": "Customer",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**📋 Save the `accessToken` - you'll need it!**

---

### Step 2: Login as Customer
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Customer123"
}
```

**✅ Expected:** Same response as registration

---

### Step 3: Get Profile
```bash
GET http://localhost:3000/auth/profile
Authorization: Bearer {accessToken}
```

**✅ Expected:** Full profile with customer-specific data

---

### Step 4: Get Basic User Info
```bash
GET http://localhost:3000/auth/me
Authorization: Bearer {accessToken}
```

**✅ Expected:**
```json
{
  "id": 1,
  "email": "customer@test.com",
  "firstName": "John",
  "lastName": "Customer",
  "role": "customer"
}
```

---

### Step 5: Test Authentication (Any User)
```bash
GET http://localhost:3000/jobs/test-auth
Authorization: Bearer {customerToken}
```

**✅ Expected:** Success - Any authenticated user can access

---

### Step 6: Create a Job (Customer Only) ✅
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {customerToken}
Content-Type: application/json

{
  "description": "Fix my sink"
}
```

**✅ Expected Response:**
```json
{
  "message": "✅ Job created successfully!",
  "createdBy": {
    "id": 1,
    "email": "customer@test.com",
    "role": "customer"
  },
  "job": {
    "id": 1,
    "description": "Fix my sink",
    "status": "pending",
    "customerId": 1
  },
  "note": "RBAC working! Only customers (or admins) can create jobs."
}
```

---

### Step 7: View My Jobs (Customer Only) ✅
```bash
GET http://localhost:3000/jobs/my-jobs
Authorization: Bearer {customerToken}
```

**✅ Expected:** List of customer's jobs

---

### Step 8: Try Provider Endpoint (Should Fail) ❌
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {customerToken}
```

**❌ Expected Response:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**🎯 This proves RBAC is working!** Customer cannot access provider-only endpoints.

---

### Step 9: Try Admin Endpoint (Should Fail) ❌
```bash
DELETE http://localhost:3000/jobs/1
Authorization: Bearer {customerToken}
```

**❌ Expected:** 403 Forbidden

---

### Step 10: Logout
```bash
POST http://localhost:3000/auth/logout
Authorization: Bearer {customerToken}
```

**✅ Expected:**
```json
{
  "message": "Logged out successfully"
}
```

---

## 📝 Test Scenario 2: Provider Flow

### Step 1: Register as Provider (Will Fail - Expected)
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "provider@test.com",
  "password": "Provider123",
  "firstName": "Bob",
  "lastName": "Provider",
  "phoneNumber": "+1234567891",
  "role": "PROVIDER"
}
```

**❌ Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Provider registration requires LSM assignment. Please use provider onboarding endpoint.",
  "error": "Bad Request"
}
```

**🎯 This is correct!** Providers need LSM assignment, so they use a special onboarding endpoint.

---

### Step 2: For Testing - Register as LSM First
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "lsm@test.com",
  "password": "LSM12345",
  "firstName": "Lisa",
  "lastName": "Manager",
  "phoneNumber": "+1234567892",
  "role": "LSM"
}
```

**✅ Save the LSM token**

---

### Step 3: Test LSM Endpoints
```bash
# LSM can view all jobs
GET http://localhost:3000/jobs/all
Authorization: Bearer {lsmToken}
```

**✅ Expected:** List of all jobs (LSM has access)

---

### Step 4: LSM Try Customer Endpoint (Should Fail)
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {lsmToken}
Content-Type: application/json

{
  "description": "Test"
}
```

**❌ Expected:** 403 Forbidden - LSM cannot create jobs (customer only)

---

## 📝 Test Scenario 3: Admin Bypass

### Step 1: Register as Admin
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Admin123",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567893",
  "role": "ADMIN"
}
```

**✅ Save the admin token**

---

### Step 2: Admin Creates Job (Bypasses Customer Restriction) ✅
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "description": "Admin creating a job"
}
```

**✅ Expected:** SUCCESS! Admin bypasses the customer-only restriction.

**Response:**
```json
{
  "message": "✅ Job created successfully!",
  "createdBy": {
    "role": "admin"
  },
  "note": "RBAC working! Only customers (or admins) can create jobs."
}
```

---

### Step 3: Admin Views Provider Jobs (Bypasses) ✅
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {adminToken}
```

**✅ Expected:** SUCCESS! Admin bypasses provider-only restriction.

---

### Step 4: Admin Deletes Job (Admin Only Endpoint) ✅
```bash
DELETE http://localhost:3000/jobs/1
Authorization: Bearer {adminToken}
```

**✅ Expected:** SUCCESS! Only admins can delete.

---

### Step 5: Admin Can Do EVERYTHING ✅
Try all endpoints with admin token - they should ALL work!

```bash
# Customer endpoint
POST http://localhost:3000/jobs
Authorization: Bearer {adminToken}

# Provider endpoint
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {adminToken}

# LSM endpoint
GET http://localhost:3000/jobs/all
Authorization: Bearer {adminToken}

# Admin endpoint
DELETE http://localhost:3000/jobs/1
Authorization: Bearer {adminToken}
```

**✅ All should succeed!** This proves admin bypass is working.

---

## 📝 Test Scenario 4: Token Refresh

### Step 1: Use Refresh Token
```bash
POST http://localhost:3000/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refreshToken from registration/login}"
}
```

**✅ Expected:**
```json
{
  "accessToken": "new_access_token...",
  "refreshToken": "new_refresh_token..."
}
```

**Note:** Old refresh token is now invalidated!

---

### Step 2: Try Old Refresh Token (Should Fail)
```bash
POST http://localhost:3000/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{old_refresh_token}"
}
```

**❌ Expected:** 401 Unauthorized - Token rotation working!

---

## 📝 Test Scenario 5: Error Cases

### Test 1: No Token
```bash
GET http://localhost:3000/jobs/test-auth
# No Authorization header
```

**❌ Expected:** 401 Unauthorized

---

### Test 2: Invalid Token
```bash
GET http://localhost:3000/jobs/test-auth
Authorization: Bearer invalid_token_here
```

**❌ Expected:** 401 Unauthorized

---

### Test 3: Duplicate Email
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "customer@test.com",  # Already exists
  "password": "Test123",
  ...
}
```

**❌ Expected:** 409 Conflict

---

### Test 4: Invalid Password on Login
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "WrongPassword"
}
```

**❌ Expected:** 401 Unauthorized

---

## 🎯 RBAC Testing Matrix

| Endpoint | Customer | Provider | LSM | Admin | Public |
|----------|----------|----------|-----|-------|--------|
| `POST /auth/register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/profile` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `GET /jobs/test-auth` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /jobs` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `GET /jobs/my-jobs` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `GET /jobs/assigned` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `PUT /jobs/:id/status` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `GET /jobs/all` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `DELETE /jobs/:id` | ❌ | ❌ | ❌ | ✅ | ❌ |

**Legend:**
- ✅ = Should work (200/201 response)
- ❌ = Should fail (401/403 response)

---

## 🔧 Using Postman/Thunder Client

### Create Environment Variables
```
customerToken = {paste access token}
providerToken = {paste access token}
lsmToken = {paste access token}
adminToken = {paste access token}
```

### Create a Collection
1. Authentication Endpoints
2. Customer Endpoints
3. Provider Endpoints
4. LSM Endpoints
5. Admin Endpoints
6. Error Cases

---

## 🧪 Quick Test Script (All Users)

```bash
# 1. Register Customer
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"Test123","firstName":"John","lastName":"Doe","phoneNumber":"+1234567890","role":"CUSTOMER"}'

# 2. Register LSM
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"lsm@test.com","password":"Test123","firstName":"Lisa","lastName":"Manager","phoneNumber":"+1234567891","role":"LSM"}'

# 3. Register Admin
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test123","firstName":"Admin","lastName":"User","phoneNumber":"+1234567892","role":"ADMIN"}'

# 4. Login and save tokens
# ... (use the accessTokens from responses)
```

---

## ✅ Success Checklist

After testing, verify:

- [ ] Customer can register and login
- [ ] Customer can create jobs
- [ ] Customer can view own jobs
- [ ] Customer CANNOT view provider jobs (403)
- [ ] Customer CANNOT delete jobs (403)
- [ ] LSM can register and login
- [ ] LSM can view all jobs
- [ ] LSM CANNOT create jobs (403)
- [ ] Admin can register and login
- [ ] Admin can create jobs (bypasses customer restriction)
- [ ] Admin can view provider jobs (bypasses provider restriction)
- [ ] Admin can view all jobs (has LSM permission)
- [ ] Admin can delete jobs (admin-only permission)
- [ ] Invalid tokens return 401
- [ ] Wrong roles return 403
- [ ] Token refresh works
- [ ] Logout invalidates refresh token

---

## 🎊 Summary

You now have **complete, working code** to test:

✅ Full authentication flow (register, login, logout)  
✅ JWT tokens (access & refresh)  
✅ Role-based access control  
✅ Admin bypass functionality  
✅ Multiple role permissions  
✅ Error handling  

**Start your server and test away!** 🚀

**Need help?** Check the response messages - they include helpful notes about what's working!

