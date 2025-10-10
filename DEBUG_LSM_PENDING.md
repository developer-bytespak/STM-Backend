# 🔍 Debug: LSM Not Seeing Pending Provider

## 🧪 **Quick Debug Commands**

### **1. Check LSM Profile & Region:**
```bash
GET http://localhost:8000/lsm/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5pa2lsQGxzbS5jb20iLCJzdWIiOjMsInJvbGUiOiJsb2NhbF9zZXJ2aWNlX21hbmFnZXIiLCJpYXQiOjE3NjAwNTMxNTksImV4cCI6MTc2MDEzOTU1OX0.7NWKuQW3rFNM5EhqJbZRuuNKbsch3JjdBeoLUYwi-pc
```

**Look for:**
```json
{
  "region": "???"  ← Check this matches "New York" exactly
}
```

---

### **2. Check All LSM Providers (Not Just Pending):**
```bash
GET http://localhost:8000/lsm/providers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5pa2lsQGxzbS5jb20iLCJzdWIiOjMsInJvbGUiOiJsb2NhbF9zZXJ2aWNlX21hbmFnZXIiLCJpYXQiOjE3NjAwNTMxNTksImV4cCI6MTc2MDEzOTU1OX0.7NWKuQW3rFNM5EhqJbZRuuNKbsch3JjdBeoLUYwi-pc
```

**This shows ALL providers in your region (any status)**

---

### **3. Check SP Profile (Login as SP):**
```bash
GET http://localhost:8000/provider/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4ucGx1bWJlckBleGFtcGxlLmNvbSIsInN1YiI6MTAsInJvbGUiOiJzZXJ2aWNlX3Byb3ZpZGVyIiwiaWF0IjoxNzYwMDUyODUzLCJleHAiOjE3NjAxMzkyNTN9.qengMJGQ9cAdPlaZWEeGxMxPzDQUR8YS2Mfw5ha7lQc
```

**Look for:**
```json
{
  "status": {
    "current": "pending"  ← Should be pending
  }
}
```

---

## 🔍 **Most Likely Issue: Region Mismatch**

### **Problem:**
LSM region in database might be different from SP region.

**Example:**
- LSM region: `"New York, NY"` (with state)
- SP registered with: `"New York"` (without state)
- **They don't match!** ❌

---

## ✅ **Quick Fix Options:**

### **Option 1: Check LSM Region in Database**
```sql
-- Using Prisma Studio or SQL
SELECT id, user_id, region FROM local_service_managers WHERE user_id = 3;

-- Check if region EXACTLY matches "New York"
```

### **Option 2: Update LSM Region to Match**
```bash
# If LSM region is "New York, NY" but should be "New York"
PUT http://localhost:8000/admin/lsms/1
Authorization: Bearer {admin_token}

{
  "region": "New York"
}
```

### **Option 3: Re-register SP with Exact LSM Region**
If LSM region is actually "New York, NY", register SP with:
```json
{
  "region": "New York, NY",  ← Match LSM's exact region
  ...
}
```

---

## 🧪 **Test in Prisma Studio:**

```bash
npx prisma studio
```

Then check:
1. **local_service_managers table** → user_id: 3 → What's the `region`?
2. **service_providers table** → user_id: 10 → What's the `lsm_id`?
3. **Compare:** Does service_providers.lsm_id match local_service_managers.id?

---

## 📊 **Expected Data:**

### **local_service_managers table:**
```
id: 1 (or 2, 3...)
user_id: 3
region: "New York"  ← This should match exactly
status: "active"
```

### **service_providers table:**
```
id: 5
user_id: 10
lsm_id: 1  ← Should match LSM's id
status: "pending"
location: "Manhattan, New York, NY"
```

---

## 🎯 **Root Cause:**

The query in `getPendingOnboarding` is:
```typescript
where: {
  lsm_id: lsm.id,  ← Matches by LSM ID (not region)
  status: 'pending',
}
```

So if:
- LSM user_id: 3 → LSM id: 1
- SP was assigned to LSM id: 1
- **Then it SHOULD appear!**

If it's NOT appearing, either:
1. ❌ SP's `lsm_id` doesn't match this LSM's `id`
2. ❌ SP's `status` is not 'pending'
3. ❌ SP wasn't created properly

---

## 🔧 **Quick Debug API I Can Add:**

Would you like me to add a temporary debug endpoint that shows:
- What LSM ID you have
- What providers exist with that LSM ID
- What their statuses are

This will help us identify the exact issue!

---

**For now, check Prisma Studio to see the actual data!** 🔍

```bash
npx prisma studio
```

Then verify:
- LSM with user_id=3 has what `id` and `region`?
- SP with user_id=10 has what `lsm_id` and `status`?
