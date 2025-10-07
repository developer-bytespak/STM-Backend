# 🗄️ **Database Setup Guide**

## 🚀 **Quick Start (Run These Commands)**

```bash
# 1. Run all pending migrations
npx prisma migrate dev --name add_all_features

# 2. Generate Prisma Client
npx prisma generate

# 3. Seed services into database
npx ts-node prisma/seed-services.ts

# 4. (Optional) Open Prisma Studio to verify
npx prisma studio
```

---

## 📊 **What the Seed Script Does**

### **Populates the `services` table with:**

- ✅ **38 Services** across 31 categories
- ✅ All marked as `status: 'approved'` (pre-approved by client)
- ✅ Auto-generated descriptions
- ✅ Ready for customer search & booking

### **Example Output:**

```
🌱 Starting service seeding...

📁 Category: Accountant
   ✅ Tax Filing (ID: 1)
   ✅ Business Planning (ID: 2)

📁 Category: Architect
   ✅ Construction Drawings (ID: 3)

📁 Category: Engineer
   ⚪ No services defined (empty category)

📁 Category: Tutor
   ✅ Guitar Lessons (ID: 15)
   ✅ Piano Lessons (ID: 16)
   ✅ Jewelry Making Party (ID: 17)
   ✅ Stained Glass Making Tutor (ID: 18)
   ✅ Spanish Language Tutor (ID: 19)

📁 Category: Plumber
   ✅ Toilet Clog (ID: 25)
   ✅ Toilet Replacement (ID: 26)

📁 Category: Exterior Cleaner
   ✅ House/Building Wash (ID: 35)
   ✅ Gutter Cleaning (ID: 36)
   ✅ Roof Cleaning (ID: 37)
   ✅ Driveway Wash (ID: 38)
   ✅ Deck Cleaning (ID: 39)
   ✅ Window Washing (ID: 40)

...

═══════════════════════════════════════════════════
🎉 SEEDING COMPLETE!

📊 Summary:
   ✅ Created:       38 services
   ⏭️  Skipped:       0 services (already exist)
   ❌ Errors:        0 services
   📂 Total categories: 31
   ⚪ Empty categories: 18
═══════════════════════════════════════════════════

📈 Top Categories by Service Count:

   Exterior Cleaner: 6 service(s)
   Tutor: 5 service(s)
   Coach: 3 service(s)
   Accountant: 2 service(s)
   Plumber: 2 service(s)

✨ Services are now searchable in the platform!

👋 Database connection closed.
```

---

## 🗄️ **Database Structure After Seeding**

### **services Table:**

```sql
SELECT id, name, category, status FROM services;
```

**Result:**
```
┌────┬─────────────────────────────┬─────────────────────┬──────────┐
│ id │ name                        │ category            │ status   │
├────┼─────────────────────────────┼─────────────────────┼──────────┤
│ 1  │ Tax Filing                  │ Accountant          │ approved │
│ 2  │ Business Planning           │ Accountant          │ approved │
│ 3  │ Construction Drawings       │ Architect           │ approved │
│ 4  │ Business Planning           │ Consultant          │ approved │
│ 5  │ Software Implementation     │ Software Specialist │ approved │
│ 6  │ Toilet Replacement          │ Handyman            │ approved │
│ 7  │ Appliance Replacement       │ Handyman            │ approved │
│ 8  │ Guitar Lessons              │ Tutor               │ approved │
│ 9  │ Piano Lessons               │ Tutor               │ approved │
│ 10 │ Jewelry Making Party        │ Tutor               │ approved │
│ 11 │ Stained Glass Making Tutor  │ Tutor               │ approved │
│ 12 │ Spanish Language Tutor      │ Tutor               │ approved │
│ 13 │ Voice Coach                 │ Coach               │ approved │
│ 14 │ Baseball Coach              │ Coach               │ approved │
│ 15 │ Softball Coach              │ Coach               │ approved │
│ 16 │ Toilet Clog                 │ Plumber             │ approved │
│ 17 │ Toilet Replacement          │ Plumber             │ approved │
│ 18 │ House/Building Wash         │ Exterior Cleaner    │ approved │
│ 19 │ Gutter Cleaning             │ Exterior Cleaner    │ approved │
│ 20 │ Roof Cleaning               │ Exterior Cleaner    │ approved │
│ 21 │ Driveway Wash               │ Exterior Cleaner    │ approved │
│ 22 │ Deck Cleaning               │ Exterior Cleaner    │ approved │
│ 23 │ Window Washing              │ Exterior Cleaner    │ approved │
│ 24 │ House Cleaning              │ Interior Cleaning   │ approved │
│ 25 │ Office Cleaning             │ Interior Cleaning   │ approved │
└────┴─────────────────────────────┴─────────────────────┴──────────┘
```

---

## 🎯 **Important Notes**

### **Duplicate Service Names Across Categories**

Notice "Business Planning" appears in both:
- Accountant → Business Planning
- Consultant → Business Planning

And "Toilet Replacement" appears in:
- Handyman → Toilet Replacement
- Plumber → Toilet Replacement

**This is intentional!** They are **separate services** with the same name but different categories.

```sql
SELECT id, name, category FROM services WHERE name = 'Business Planning';

Result:
┌────┬───────────────────┬────────────┐
│ id │ name              │ category   │
├────┼───────────────────┼────────────┤
│ 2  │ Business Planning │ Accountant │
│ 4  │ Business Planning │ Consultant │
└────┴───────────────────┴────────────┘
```

**Why?** Because customers might want:
- Accountant business planning (tax-focused)
- Consultant business planning (strategy-focused)

---

## 🔄 **Running Multiple Times**

The script is **idempotent** - you can run it multiple times safely:

```bash
# First run: Creates 38 services
npx ts-node prisma/seed-services.ts
# Output: ✅ Created: 38 services

# Second run: Skips all (already exist)
npx ts-node prisma/seed-services.ts
# Output: ⏭️ Skipped: 38 services (already exist)
```

---

## 🧪 **Verify Services Were Created**

### **Option 1: Prisma Studio (GUI)**
```bash
npx prisma studio
# Opens browser at http://localhost:5555
# Click "services" table → See all 38+ services
```

### **Option 2: SQL Query**
```bash
# Connect to your database
psql -d your_database_name

# Count services
SELECT COUNT(*) FROM services;
# Should return: 38

# View by category
SELECT category, COUNT(*) as service_count 
FROM services 
GROUP BY category 
ORDER BY service_count DESC;
```

### **Option 3: API Call (after server starts)**
```bash
# Login as admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Get all services
curl -X GET http://localhost:8000/admin/services \
  -H "Authorization: Bearer <admin-token>"
```

---

## 📋 **Complete Database Setup Checklist**

```bash
# ✅ Step 1: Run migrations
npx prisma migrate dev --name add_all_features

# ✅ Step 2: Generate Prisma Client  
npx prisma generate

# ✅ Step 3: Seed services
npx ts-node prisma/seed-services.ts

# ✅ Step 4: (Optional) Create test users
# You can manually create via API or create another seed script

# ✅ Step 5: Start server
npm run dev

# ✅ Step 6: Test search
curl "http://localhost:8000/search/autocomplete?query=plu"
# Should return: Plumber category + Plumbing services
```

---

## 🎯 **Expected Database State After Seeding**

### **services Table:**
- **Total rows:** 38
- **Status:** All `approved`
- **Searchable:** Yes (indexed on name, category)

### **Categories with Services:**
| Category | Service Count |
|----------|---------------|
| Exterior Cleaner | 6 |
| Tutor | 5 |
| Coach | 3 |
| Accountant | 2 |
| Plumber | 2 |
| Handyman | 2 |
| Interior Cleaning | 2 |
| Architect | 1 |
| Consultant | 1 |
| Software Specialist | 1 |
| (18 empty categories) | 0 |

### **Empty Categories (No Services Yet):**
- Engineer, Land Surveyor, Computer Programmer, Veterinarian, Photographer, Real Estate Agent, Mental Health Counselor, In Home Health Care, BabySitting, Electrician, HVAC, Carpenter, Garage Door Technician, Windshield Technician, Garbage and Junk Removal Specialist, Copywriter, Publisher, Pest Control, Media Organizing, Barber, Hair Stylist

**When SP requests these services, they'll go through LSM → Admin approval flow.**

---

## 🔧 **Troubleshooting**

### **Error: "Cannot find module '@prisma/client'"**
```bash
npx prisma generate
```

### **Error: "Table 'services' doesn't exist"**
```bash
npx prisma migrate dev
```

### **Error: "Invalid connection string"**
```bash
# Check .env file
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
```

### **Want to Reset Database?**
```bash
# Warning: This deletes ALL data!
npx prisma migrate reset
npx ts-node prisma/seed-services.ts
```

---

## ✅ **Ready to Run!**

Just run this command:

```bash
npx ts-node prisma/seed-services.ts
```

**That's it!** Your database will be populated with all 38 services. 🎉
