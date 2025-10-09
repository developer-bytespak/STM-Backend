# Service Provider APIs - Schema Changes Summary

## ✅ **SCHEMA CHANGES COMPLETE**

Ready for migration.

---

## **📋 CHANGES MADE:**

### **1. Jobs Table - Added Negotiation & Acceptance Tracking**

**New fields:**
```prisma
model jobs {
  // ... existing fields
  edited_answers    Json?     // SP's negotiated changes (price, schedule, answers)
  sp_accepted       Boolean   @default(false)  // SP accepted job (before customer closes deal)
  
  // NEW RELATION:
  payment           payments?  // One-to-one with payment table
}
```

**Why:**
- `edited_answers` - Stores SP's proposed changes when negotiating
- `sp_accepted` - Tracks if SP accepted job (workflow: SP accepts → stays 'new' → Customer closes deal → 'in_progress')
- `payment` - Links to payment tracking table

---

### **2. Payments Table - NEW TABLE**

**Complete table:**
```prisma
model payments {
  id         Int           @id @default(autoincrement())
  job_id     Int           @unique  // One payment per job
  job        jobs          @relation(fields: [job_id], references: [id])
  amount     Decimal       @default(0.00) @db.Decimal(10, 2)
  method     String?       // cash, card, bank_transfer, online
  status     PaymentStatus @default(pending)  // ENUM: pending, received, disputed
  marked_by  Int?          // SP user_id who marked payment received
  marked_at  DateTime?     // When payment was marked
  notes      String?       // SP notes about payment
  created_at DateTime      @default(now())
  updated_at DateTime      @updatedAt
  
  @@index([job_id])
  @@index([status])
}
```

**New enum:**
```prisma
enum PaymentStatus {
  pending
  received
  disputed
}
```

**Why Separate Table:**
- ✅ 3NF compliance (payment data separate from job)
- ✅ Independent payment lifecycle (pending → received → disputed)
- ✅ Future-proof (easy to add invoices, refunds, splits)
- ✅ Better tracking (who marked, when, method, notes)
- ✅ Cleaner queries

---

## **🔄 PAYMENT WORKFLOW:**

### **Job Creation:**
```
1. Create job (status='new', price=0 initially)
2. Create payment record (status='pending', amount=0)
3. Create chat
```

### **Negotiation (SP changes price):**
```
1. SP negotiates → edited_answers includes new price
2. Customer approves → job.price updated
3. Payment.amount updated to match job.price
```

### **Job Completion:**
```
POST /provider/jobs/:id/update-status
Action: "mark_complete"

1. job.status = 'completed'
2. payment.amount = job.price (finalized)
3. payment.status = 'pending' (awaiting payment)
4. Notify customer to pay
```

### **Payment Received:**
```
POST /provider/jobs/:id/update-status
Action: "mark_payment"
Body: { "method": "cash", "notes": "Paid in full" }

1. payment.status = 'received'
2. payment.marked_by = sp_user_id
3. payment.marked_at = now()
4. payment.method = "cash"
5. job.status = 'paid'
6. job.paid_at = now() (redundant but kept)
7. provider.earning += payment.amount
8. Notify both parties
```

---

## **📊 MIGRATION DETAILS:**

### **Migration Name:**
```
add_sp_features_payment_table_negotiation
```

### **SQL Changes:**

```sql
-- 1. Add negotiation fields to jobs
ALTER TABLE jobs 
ADD COLUMN edited_answers JSONB,
ADD COLUMN sp_accepted BOOLEAN DEFAULT false;

-- 2. Create payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  job_id INTEGER UNIQUE NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0.00,
  method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  marked_by INTEGER,
  marked_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 3. Migrate existing jobs to payment table (if needed)
-- INSERT INTO payments (job_id, amount, status, marked_at)
-- SELECT id, price, 
--   CASE WHEN status = 'paid' THEN 'received' ELSE 'pending' END,
--   paid_at
-- FROM jobs;
```

---

## **🎯 AFFECTED APIS:**

### **Existing APIs (No Breaking Changes):**
- All current job APIs remain backward compatible
- Payment info now comes from `payments` table join

### **New SP APIs Enabled:**
1. POST /provider/jobs/:id/respond - Enhanced with negotiate action
2. POST /provider/jobs/:id/update-status - Mark complete/payment
3. GET /provider/jobs/:id - Includes payment details
4. GET /provider/dashboard - Shows payment stats
5. GET /provider/profile - Complete profile
6. PUT /provider/profile - Update profile + areas
7. POST /provider/availability - Set active/inactive
8. GET /provider/jobs - Enhanced with filters

---

## **✅ VALIDATION:**

- [x] No linter errors
- [x] All relations properly defined
- [x] Indexes added for performance
- [x] Foreign keys correct
- [x] Default values set
- [x] Comments for clarity
- [x] Backward compatible (kept `paid_at` in jobs)

---

## **🚀 NEXT STEPS:**

1. **Run migration:**
   ```bash
   npx prisma migrate dev --name add_sp_features_payment_table_negotiation
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Confirm migration successful**

4. **I implement all 8 SP APIs**

---

## **📝 NOTES:**

### **Payment Table Benefits:**
- Separates payment concerns from job lifecycle
- Can track payment disputes independently
- Easy to add refunds, partial payments later
- Better audit trail (who marked, when, method)

### **Job Fields:**
- `edited_answers` - SP's negotiation proposals
- `sp_accepted` - Tracks SP acceptance before customer closes deal
- `paid_at` - Kept for backward compatibility (redundant with payment.marked_at)

### **Workflow Alignment:**
- ✅ SP can negotiate (edited_answers)
- ✅ SP accepts but job stays 'new' (sp_accepted flag)
- ✅ Customer closes deal → 'in_progress'
- ✅ SP marks complete → payment.status='pending'
- ✅ SP marks payment → payment.status='received', job.status='paid'

---

**Schema ready for migration!** ✅

