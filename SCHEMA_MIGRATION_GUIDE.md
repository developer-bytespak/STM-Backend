# 🗄️ Schema Migration Guide

## ✅ **Schema Updated - Ready to Migrate**

I've updated your Prisma schema with the necessary table for platform settings.

---

## 📋 **What Was Added**

### **New Table: `platform_settings`**

```prisma
model platform_settings {
  id                           Int      @id @default(autoincrement())
  response_deadline_mins       Int      @default(60)
  warning_threshold            Int      @default(3)
  popularity_threshold         Int      @default(10)
  cancellation_fee_percentage  Decimal  @default(25) @db.Decimal(5, 2)
  default_in_person_visit_cost Decimal  @default(50.00) @db.Decimal(10, 2)
  updated_by                   Int
  updated_at                   DateTime @updatedAt
  created_at                   DateTime @default(now())

  @@index([created_at])
}
```

### **Purpose:**
Stores admin-configurable platform settings:
- Response deadline for SPs (in minutes)
- Warning threshold (number of warnings before LSM review)
- Popularity threshold (number of jobs to mark service as popular)
- Cancellation fee percentage
- Default in-person visit cost

### **Design:**
- Versioned approach: Each update creates a new record
- Always fetches latest settings: `orderBy: { id: 'desc' }`
- Keeps history for audit trail
- Falls back to defaults if no settings exist

---

## 🚀 **Migration Commands**

### **Step 1: Generate Migration**
```bash
npx prisma migrate dev --name add_platform_settings
```

### **Step 2: Generate Prisma Client**
```bash
npx prisma generate
```

### **Step 3: (Optional) Insert Default Settings**
You can create the first settings record via API or SQL:

**Via SQL:**
```sql
INSERT INTO platform_settings (
  response_deadline_mins,
  warning_threshold,
  popularity_threshold,
  cancellation_fee_percentage,
  default_in_person_visit_cost,
  updated_by,
  created_at,
  updated_at
) VALUES (
  60,    -- 1 hour response deadline
  3,     -- 3 warnings threshold
  10,    -- 10 jobs = popular
  25,    -- 25% cancellation fee
  50.00, -- $50 in-person visit
  1,     -- Admin user ID
  NOW(),
  NOW()
);
```

**Via API (After Migration):**
```bash
PUT http://localhost:8000/admin/settings
Authorization: Bearer {admin_token}

{
  "responseDeadlineMinutes": 60,
  "warningThreshold": 3,
  "popularityThreshold": 10,
  "cancellationFeePercentage": 25,
  "defaultInPersonVisitCost": 50.00
}
```

---

## 📊 **Code Changes Made**

### **1. Schema File:**
✅ `prisma/schema.prisma` - Added `platform_settings` table

### **2. Admin Service:**
✅ `src/modules/admin/admin.service.ts` - Updated to use database:
- `getSettings()` - Fetches from DB (falls back to defaults)
- `updateSettings()` - Creates new versioned record

### **3. No Breaking Changes:**
- Existing code unchanged
- APIs work with or without settings in DB
- Defaults used if no settings exist

---

## 🧪 **Testing After Migration**

### **1. Verify Migration:**
```bash
# Check if table was created
npx prisma studio
# Navigate to platform_settings table
```

### **2. Test Get Settings (Will Return Defaults):**
```bash
GET http://localhost:8000/admin/settings
Authorization: Bearer {admin_token}

# Expected Response (if no settings in DB):
{
  "responseDeadlineMinutes": 60,
  "warningThreshold": 3,
  "popularityThreshold": 10,
  "cancellationFeePercentage": 25,
  "defaultInPersonVisitCost": 50.0,
  "updatedAt": "2025-10-09T...",
  "message": "Using default settings. No settings record found in database."
}
```

### **3. Test Update Settings:**
```bash
PUT http://localhost:8000/admin/settings
Authorization: Bearer {admin_token}

{
  "responseDeadlineMinutes": 90,
  "warningThreshold": 5
}

# Expected Response:
{
  "message": "Settings updated successfully",
  "settings": {
    "id": 1,
    "responseDeadlineMinutes": 90,
    "warningThreshold": 5,
    "popularityThreshold": 10,
    "cancellationFeePercentage": 25,
    "defaultInPersonVisitCost": 50.0,
    "updatedBy": 1,
    "updatedAt": "2025-10-09T..."
  }
}
```

### **4. Verify Settings Persisted:**
```bash
GET http://localhost:8000/admin/settings

# Should return the updated settings (no message about defaults)
{
  "id": 1,
  "responseDeadlineMinutes": 90,
  "warningThreshold": 5,
  ...
}
```

---

## 🔄 **How Settings Versioning Works**

### **Update Flow:**
```
1. Admin calls PUT /admin/settings
2. System fetches current settings (latest record)
3. Merges provided fields with current values
4. Creates NEW record with merged data
5. Latest record is always used (ORDER BY id DESC)
```

### **Example Timeline:**
```sql
-- Initial settings (created via API)
id=1: response_deadline=60, warning_threshold=3

-- Admin updates deadline
id=2: response_deadline=90, warning_threshold=3

-- Admin updates threshold
id=3: response_deadline=90, warning_threshold=5

-- System always uses id=3 (latest)
```

### **Benefits:**
✅ Full audit trail (who changed what, when)
✅ Can revert to previous settings if needed
✅ No data loss
✅ Simple implementation

---

## 📝 **Migration Checklist**

- [x] Schema updated with `platform_settings` table
- [x] Admin service updated to use database
- [ ] Run `npx prisma migrate dev --name add_platform_settings`
- [ ] Run `npx prisma generate`
- [ ] (Optional) Insert default settings via API or SQL
- [ ] Test GET /admin/settings
- [ ] Test PUT /admin/settings
- [ ] Verify settings persist across restarts

---

## ⚠️ **Important Notes**

1. **No Breaking Changes:** 
   - Existing APIs work unchanged
   - Falls back to defaults if no settings in DB
   - Safe to migrate anytime

2. **Versioned Approach:**
   - Each update creates new record
   - Keeps full history
   - Latest record always used

3. **updated_by Field:**
   - Stores admin user ID who made the change
   - For audit purposes
   - Required field

4. **Defaults:**
   - Response deadline: 60 minutes (1 hour)
   - Warning threshold: 3 warnings
   - Popularity threshold: 10 jobs
   - Cancellation fee: 25%
   - In-person visit: $50.00

---

## 🚀 **Ready to Migrate!**

Just run:
```bash
npx prisma migrate dev --name add_platform_settings
npx prisma generate
```

Then test the settings APIs! 🎉

