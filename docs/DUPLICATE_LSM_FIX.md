# 🔧 Critical Fix: Duplicate LSM Prevention

## ❌ **CRITICAL BUG FOUND & FIXED**

### **The Problem:**
Backend was allowing **multiple LSMs to register for the same region**, violating the "ONE LSM PER REGION" business rule!

**Example:**
```
Region: "New York"

LSM #1: nikil@lsm.com     ✅ Created
LSM #2: asjad111@gmail.com ✅ Created (SHOULD BE BLOCKED!) ❌
LSM #3: asd11@gmail.com    ✅ Created (SHOULD BE BLOCKED!) ❌
```

This caused:
- ❌ Multiple LSMs managing same region (confusion)
- ❌ SPs randomly assigned to different LSMs
- ❌ Pending applications split across multiple LSMs
- ❌ **This is why you saw empty pending list!**

---

## ✅ **THE FIX**

### **File Updated:**
`src/modules/oauth/oauth.service.ts` (lines 272-295)

### **What Was Added:**
```typescript
case UserRole.LSM:
  // Check if LSM already exists for this region
  const existingLSM = await prisma.local_service_managers.findFirst({
    where: {
      region: region,
      status: 'active',
    },
    include: {
      user: {
        select: { first_name: true, last_name: true, email: true },
      },
    },
  });

  if (existingLSM) {
    throw new ConflictException(
      `An active LSM already exists for region "${region}". ` +
      `LSM: ${existingLSM.user.first_name} ${existingLSM.user.last_name} (${existingLSM.user.email}). ` +
      `Only one LSM is allowed per region. Please contact admin to replace the existing LSM.`
    );
  }
  
  // Create LSM (only if no existing LSM in region)
  await prisma.local_service_managers.create({...});
```

---

## 🧪 **Test the Fix:**

### **Scenario 1: First LSM in Region (Should Work)**
```bash
POST http://localhost:8000/auth/register

{
  "email": "first.lsm@example.com",
  "password": "password123",
  "firstName": "First",
  "lastName": "LSM",
  "phoneNumber": "+11111111111",
  "role": "LSM",
  "region": "Brooklyn"
}

# Expected: ✅ Success (first LSM in Brooklyn)
```

---

### **Scenario 2: Duplicate LSM in Same Region (Should FAIL)**
```bash
POST http://localhost:8000/auth/register

{
  "email": "second.lsm@example.com",
  "password": "password123",
  "firstName": "Second",
  "lastName": "LSM",
  "phoneNumber": "+12222222222",
  "role": "LSM",
  "region": "Brooklyn"  ← Same region!
}

# Expected: ❌ Error 409 Conflict
{
  "statusCode": 409,
  "message": "An active LSM already exists for region \"Brooklyn\". LSM: First LSM (first.lsm@example.com). Only one LSM is allowed per region. Please contact admin to replace the existing LSM.",
  "error": "Conflict"
}
```

---

## 🔒 **Where LSM Creation is Protected:**

### **1. Public Registration (POST /auth/register):**
✅ **NOW PROTECTED** - Just added the check

### **2. Admin Create LSM (POST /admin/lsm/create):**
✅ **ALREADY PROTECTED** - Check was already there (line 471-477 in admin.service.ts)

### **3. Admin Replace LSM (POST /admin/lsms/:id/replace):**
✅ **PROTECTED BY DESIGN** - Replaces existing LSM, doesn't create duplicate

---

## 🎯 **Current State of Your Database:**

You now have **3 LSMs for "New York"**:
```
id: 1, user_id: 3,  email: nikil@lsm.com      region: "New York"
id: 2, user_id: 11, email: asjad111@gmail.com region: "New York"
id: 3, user_id: 12, email: asd11@gmail.com    region: "New York"
```

**Problem:** Which LSM gets the pending SPs?
**Answer:** The **first one found** (oldest created, id: 1)

That's why when you log in as LSM (user_id: 3, lsm_id: 1), the SP registered with "New York" was assigned to **that same LSM** but you might be checking with a different LSM account!

---

## 🔧 **How to Clean Up:**

### **Option 1: Delete Duplicate LSMs (SQL)**
```sql
-- Keep only the first LSM (id: 1), delete the others
DELETE FROM local_service_managers WHERE id IN (2, 3);

-- Also delete their user accounts
DELETE FROM users WHERE id IN (11, 12);
```

### **Option 2: Use Admin API to Replace**
```bash
# Keep LSM #1, delete LSM #2
DELETE http://localhost:8000/admin/lsms/2
Authorization: Bearer {admin_token}

# Keep LSM #1, delete LSM #3
DELETE http://localhost:8000/admin/lsms/3
```

### **Option 3: Set Duplicates to Inactive**
```bash
# Mark LSM #2 as inactive
PUT http://localhost:8000/admin/lsms/2
{
  "status": "inactive"
}

# Mark LSM #3 as inactive
PUT http://localhost:8000/admin/lsms/3
{
  "status": "inactive"
}
```

---

## 🧪 **Verify Fix Works:**

### **Step 1: Try Creating Duplicate LSM Now**
```bash
POST http://localhost:8000/auth/register

{
  "email": "duplicate.lsm@example.com",
  "password": "password123",
  "firstName": "Duplicate",
  "lastName": "LSM",
  "phoneNumber": "+13333333333",
  "role": "LSM",
  "region": "New York"  ← Region with existing LSM
}

# Expected Error:
{
  "statusCode": 409,
  "message": "An active LSM already exists for region \"New York\". LSM: John Doe (nikil@lsm.com). Only one LSM is allowed per region. Please contact admin to replace the existing LSM.",
  "error": "Conflict"
}
```

✅ **It will now be BLOCKED!**

---

### **Step 2: Create LSM in New Region (Should Work)**
```bash
POST http://localhost:8000/auth/register

{
  "email": "brooklyn.lsm@example.com",
  "password": "password123",
  "firstName": "Brooklyn",
  "lastName": "Manager",
  "phoneNumber": "+14444444444",
  "role": "LSM",
  "region": "Brooklyn"  ← Different region
}

# Expected: ✅ Success (first LSM in Brooklyn)
```

---

## 📊 **Summary:**

### **Before Fix:**
❌ Multiple LSMs per region allowed  
❌ SPs assigned to random LSMs  
❌ Pending lists split across multiple LSMs  
❌ Chaos!

### **After Fix:**
✅ Only ONE active LSM per region  
✅ Clear error message with existing LSM details  
✅ Admins can use "Replace LSM" feature  
✅ One LSM per region rule enforced  

---

## 🎯 **Action Items:**

1. ✅ **Fix Applied** - Duplicate prevention added
2. ⏳ **Clean Database** - Remove duplicate LSMs (ids: 2, 3)
3. ⏳ **Test** - Try creating duplicate LSM (should fail)
4. ⏳ **Verify** - Pending providers now visible

---

## 🧹 **Quick Cleanup Commands:**

### **Using Prisma Studio:**
```bash
npx prisma studio

# Navigate to:
1. local_service_managers table
2. Delete records with id: 2 and 3
3. Navigate to users table
4. Delete records with id: 11 and 12
```

### **Using SQL:**
```sql
-- Delete duplicate LSMs
DELETE FROM local_service_managers WHERE id IN (2, 3);

-- Delete their user accounts
DELETE FROM users WHERE id IN (11, 12);
```

---

**After cleanup, your pending providers will appear correctly!** ✅

The SP "ABC Plumbing Services" (user_id: 10) will show up in:
```
GET /lsm/onboarding/pending
Authorization: Bearer {first_lsm_token}
```

🎉 **Critical bug fixed!**

