# ⚡ Quick Test Commands - Copy & Paste

## 🚀 Quick Start (3 Steps)

### 1️⃣ Register Customer
```bash
POST http://localhost:3000/auth/register

{
  "email": "customer@test.com",
  "password": "Test123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```
**📋 Save the `accessToken`**

---

### 2️⃣ Test Customer Endpoint ✅
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {accessToken}

{
  "description": "Fix my sink"
}
```
**✅ Should work! Customer can create jobs.**

---

### 3️⃣ Test Provider Endpoint ❌
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {accessToken}
```
**❌ Should fail with 403! Customer cannot access provider endpoints.**

**🎉 RBAC is working if step 2 succeeds and step 3 fails!**

---

## 🔑 Register All Roles

### Customer
```json
POST http://localhost:3000/auth/register

{
  "email": "customer@test.com",
  "password": "Test123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```

### LSM
```json
POST http://localhost:3000/auth/register

{
  "email": "lsm@test.com",
  "password": "Test123",
  "firstName": "Lisa",
  "lastName": "Manager",
  "phoneNumber": "+1234567891",
  "role": "LSM"
}
```

### Admin
```json
POST http://localhost:3000/auth/register

{
  "email": "admin@test.com",
  "password": "Test123",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567892",
  "role": "ADMIN"
}
```

---

## 🔐 Authentication Endpoints

### Login
```bash
POST http://localhost:3000/auth/login

{
  "email": "customer@test.com",
  "password": "Test123"
}
```

### Get Profile
```bash
GET http://localhost:3000/auth/profile
Authorization: Bearer {accessToken}
```

### Get Me
```bash
GET http://localhost:3000/auth/me
Authorization: Bearer {accessToken}
```

### Refresh Token
```bash
POST http://localhost:3000/auth/refresh

{
  "refreshToken": "{refreshToken}"
}
```

### Logout
```bash
POST http://localhost:3000/auth/logout
Authorization: Bearer {accessToken}
```

---

## 👤 Customer Endpoints (CUSTOMER role)

### Create Job ✅ Customer
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {customerToken}

{
  "description": "Fix my sink"
}
```

### Get My Jobs ✅ Customer
```bash
GET http://localhost:3000/jobs/my-jobs
Authorization: Bearer {customerToken}
```

---

## 🔧 Provider Endpoints (PROVIDER role)

### Get Assigned Jobs ✅ Provider
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {providerToken}
```

### Update Job Status ✅ Provider
```bash
PUT http://localhost:3000/jobs/1/status
Authorization: Bearer {providerToken}

{
  "status": "completed"
}
```

---

## 👔 LSM Endpoints (LSM + ADMIN roles)

### View All Jobs ✅ LSM/Admin
```bash
GET http://localhost:3000/jobs/all
Authorization: Bearer {lsmToken}
```

---

## 👑 Admin Endpoints (ADMIN only)

### Delete Job ✅ Admin Only
```bash
DELETE http://localhost:3000/jobs/1
Authorization: Bearer {adminToken}
```

---

## 🔓 Public Endpoint (Any Authenticated User)

### Test Auth
```bash
GET http://localhost:3000/jobs/test-auth
Authorization: Bearer {anyToken}
```

---

## 🧪 Test Admin Bypass

### Admin Creates Job (Bypasses Customer Restriction)
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {adminToken}

{
  "description": "Admin creating job"
}
```
**✅ Should work! Admin bypasses customer-only restriction.**

### Admin Views Provider Jobs (Bypasses Provider Restriction)
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {adminToken}
```
**✅ Should work! Admin bypasses provider-only restriction.**

### Admin Does Everything
```bash
# Admin can access ALL endpoints
GET http://localhost:3000/jobs/my-jobs      # Customer endpoint
GET http://localhost:3000/jobs/assigned     # Provider endpoint
GET http://localhost:3000/jobs/all          # LSM endpoint
DELETE http://localhost:3000/jobs/1         # Admin endpoint
```
**✅ All should work!**

---

## ❌ Test Failures (Should Return 403)

### Customer Tries Provider Endpoint
```bash
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {customerToken}
```
**❌ Expected: 403 Forbidden**

### Customer Tries Admin Endpoint
```bash
DELETE http://localhost:3000/jobs/1
Authorization: Bearer {customerToken}
```
**❌ Expected: 403 Forbidden**

### LSM Tries Customer Endpoint
```bash
POST http://localhost:3000/jobs
Authorization: Bearer {lsmToken}

{ "description": "Test" }
```
**❌ Expected: 403 Forbidden**

---

## 🎯 One-Liner Tests

### Verify Customer Role Works
```bash
# Register → Create Job → Should succeed
POST /auth/register (role: CUSTOMER) → POST /jobs → ✅ 201
```

### Verify Customer Cannot Access Provider Endpoints
```bash
# Register as Customer → Try Provider Endpoint → Should fail
POST /auth/register (role: CUSTOMER) → GET /jobs/assigned → ❌ 403
```

### Verify Admin Bypass Works
```bash
# Register as Admin → Try Customer Endpoint → Should succeed
POST /auth/register (role: ADMIN) → POST /jobs → ✅ 201
```

---

## 📊 Expected Results

| User | POST /jobs | GET /assigned | GET /all | DELETE /jobs/1 |
|------|-----------|---------------|----------|----------------|
| Customer | ✅ 201 | ❌ 403 | ❌ 403 | ❌ 403 |
| Provider | ❌ 403 | ✅ 200 | ❌ 403 | ❌ 403 |
| LSM | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| Admin | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 200 |

---

## 🔧 Using REST Client (VS Code)

Create a file `test.http`:

```http
### Variables
@baseUrl = http://localhost:3000
@customerToken = paste_token_here
@adminToken = paste_token_here

### Register Customer
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Test123",
  "firstName": "John",
  "lastName": "Customer",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}

### Create Job (Customer)
POST {{baseUrl}}/jobs
Authorization: Bearer {{customerToken}}
Content-Type: application/json

{
  "description": "Fix sink"
}

### Try Provider Endpoint (Should Fail)
GET {{baseUrl}}/jobs/assigned
Authorization: Bearer {{customerToken}}
```

---

## ⚡ Super Quick Test (30 seconds)

```bash
# 1. Register
POST http://localhost:3000/auth/register
{ "email": "test@test.com", "password": "Test123", 
  "firstName": "Test", "lastName": "User", 
  "phoneNumber": "+1234567890", "role": "CUSTOMER" }

# 2. Copy accessToken from response

# 3. Create job (should work)
POST http://localhost:3000/jobs
Authorization: Bearer {token}
{ "description": "Test job" }

# 4. Try provider endpoint (should fail)
GET http://localhost:3000/jobs/assigned
Authorization: Bearer {token}
```

**If #3 succeeds and #4 fails → RBAC is working! 🎉**

---

## 💡 Pro Tips

1. **Save tokens** in environment variables for easy testing
2. **Use Postman/Thunder Client** for better organization
3. **Check response messages** - they include helpful notes
4. **Test in order**: Register → Login → Test endpoints
5. **Admin token** should work for ALL endpoints

---

## 🎊 You're All Set!

**Start testing:** `npm run start:dev`  
**Full guide:** `TESTING_GUIDE.md`  
**Quick ref:** This file

**Happy Testing! 🚀**

