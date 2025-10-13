# Schema Changes & Discussion Summary

**Date:** October 6, 2025  
**Context:** Backend API planning for STM (Service Marketplace Platform)  
**Phase:** Phase 1 - Manual Payments, Basic Workflows

---

## Table of Contents
1. [Conversation Summary](#conversation-summary)
2. [Business Logic & Design Decisions](#business-logic--design-decisions)
3. [Complete Schema Changes](#complete-schema-changes)
4. [Implementation Notes](#implementation-notes)
5. [Next Steps](#next-steps)

---

## Conversation Summary

### What We Discussed
1. **Reviewed comprehensive workflow document** covering all user roles (Customer, Service Provider, LSM, Admin)
2. **Analyzed existing Prisma schema** to identify gaps
3. **Discussed and finalized all missing tables and fields** needed for Phase 1
4. **Made key architectural decisions** about data modeling

### Key Outcomes
- ✅ Identified 4 new tables needed (disputes, search logs, service requests, provider-services junction)
- ✅ Clarified soft-delete strategy for audit trails
- ✅ Designed region-wise popularity system with manual admin override
- ✅ Restructured services from SP-owned to catalog model (many-to-many)
- ✅ Added job negotiation tracking fields
- ✅ Added payment tracking fields
- ✅ Fixed ratings_feedback relation issue

---

## Business Logic & Design Decisions

### 1. **Service Model: Catalog with Many-to-Many**

**Decision:** Platform maintains ~45 pre-created services. Multiple SPs can offer the same service.

**Flow:**
- Platform has "Plumbing" service (master catalog)
- SP1 signs up → selects "Plumbing" 
- SP2 signs up → selects "Plumbing"
- Customer searches "Plumbing" → sees both SP1 and SP2

**Implementation:** `provider_services` junction table linking SPs to services they offer.

---

### 2. **Soft-Delete Strategy**

**Decision:** Use soft-delete for chats and rejected SP records (not hard delete).

**Reasons:**
- **Legal/Compliance:** Need audit trail for disputes ("SP was rude before rejecting")
- **Fraud Prevention:** Check if email/phone already rejected, prevent spam re-applications
- **Analytics:** Track rejection rates and reasons
- **Accountability:** LSM/admin can review historical decisions

**Implementation:**
- `chat.is_deleted = true` when SP rejects job
- `service_providers.is_deleted = true` when LSM rejects onboarding (but keep `status = rejected` as primary indicator)
- Optional Phase 2: Cron job to hard-delete chats older than 90 days if storage becomes concern

**Note:** Chat messages are tiny (text only), storage is negligible. Don't worry about it for Phase 1.

---

### 3. **Popularity System: Region-Wise with Logs**

**Decision:** Track searches in logs table, calculate popularity per region via weekly cron.

**Requirements:**
- Popularity is **region-specific** (Plumbing popular in NYC, not in rural areas)
- **Admin can manually override** for marketing/launch purposes
- **Threshold not decided yet** (will determine after collecting data)

**Implementation:**
- Log every search in `service_search_logs` with service_id, region, timestamp
- Weekly cron job: count searches per service per region → update `services.is_popular`
- Admin can toggle `is_popular` manually anytime

**Phase 2 Consideration:** Create `service_region_popularity` cached table for better performance when traffic scales.

---

### 4. **Job Negotiation Flow**

**Decision:** No need for `edited_versions` JSONB tracking. Negotiation happens in chat.

**Flow:**
1. SP edits job details via `PATCH /jobs/:id` (price, schedule, etc.)
2. Backend sets `pending_approval = true`
3. Customer gets notification
4. Customer reviews changes in chat context
5. Customer approves via `POST /jobs/:id/approve` → sets `pending_approval = false`

**Implementation:** Simple boolean flag + rejection_reason field if needed.

---

### 5. **Service Requests (Missing Services)**

**Decision:** Store search requests that yield no results + send email to LSM.

**Reasons:**
- LSM can see aggregated demand ("10 people searched for 'pool cleaning' this month")
- Helps prioritize which services to add or which SPs to onboard
- Better than just email (emails get lost, no analytics)

**Implementation:** Minimal table with keyword, region, email_sent flag.

---

### 6. **Warnings Tracking**

**Decision:** Use simple integer field on `service_providers` table (not separate table).

**Flow:**
- SP doesn't respond within `response_deadline` (1 hour default)
- Increment `warnings` field
- After 3 warnings → trigger LSM manual review (Phase 1 manual, Phase 2 automated)

**Implementation:** Just `warnings: Int @default(0)` field. No need for `last_warning_at` since we're already sending emails.

---

### 7. **Rejection Reason Storage**

**Decision:** Store `rejection_reason` in database (not just email).

**Reasons:**
- LSM might forget why they rejected when SP asks later
- Admin can review if SP complains
- Analytics: "Most common rejection = incomplete docs" → improve onboarding
- Accountability: Prevents arbitrary rejections

**Implementation:** `service_providers.rejection_reason String?` filled by LSM before rejecting.

---

### 8. **Payment Tracking**

**Decision:** Add `paid_at` timestamp field to jobs table (Phase 1 minimal).

**Phase 1:** Manual payment marking by SP
- SP marks payment received → `job.status = paid`, `job.paid_at = now()`
- Email confirmation sent to both parties

**Phase 2:** Will add full `payments` table with method, amount, office_id, marked_by, etc.

---

### 9. **Timestamps We Don't Need**

**Decisions:**
- ❌ `closed_deal_at` - Not needed, customer and SP can see date in chat
- ❌ `approved_by` on service_providers - Not needed, SP request goes to specific regional LSM anyway
- ❌ `last_warning_at` - Not needed, we're already sending email notifications

---

## Complete Schema Changes

### 1. Add New Enums

```prisma
enum DisputeStatus {
  pending
  resolved
}
```

**Reason:** Track dispute lifecycle (pending → resolved by LSM).

---

### 2. Update Existing Enums

**Change `JobStatus.rejected` to `JobStatus.rejected_by_sp`:**

```prisma
enum JobStatus {
  new
  in_progress
  completed
  cancelled
  paid
  rejected_by_sp  // CHANGED from "rejected" for clarity
}
```

**Reason:** Be explicit that SP rejected (vs customer cancelled). Helps with analytics.

---

### 3. New Tables

#### A) disputes

```prisma
model disputes {
  id               Int           @id @default(autoincrement())
  job_id           Int
  job              jobs          @relation(fields: [job_id], references: [id])
  chat_id          String        @db.Uuid
  chat             chat          @relation(fields: [chat_id], references: [id])
  raised_by_id     Int           // user_id who raised it
  raised_by_type   SenderType    // customer or service_provider
  description      String
  attachments      String[]      // array of file URLs/paths
  status           DisputeStatus @default(pending)
  resolved_by      Int?          // LSM user_id who resolved
  resolution_notes String?
  created_at       DateTime      @default(now())
  resolved_at      DateTime?
}
```

**Reasons:**
- Customer/SP can file disputes on jobs
- LSM automatically added to chat for review
- Track who filed it, what the issue is, attachments for evidence
- Store resolution notes for future reference
- References both `job_id` (what job) and `chat_id` (easy access to chat history)

---

#### B) service_search_logs

```prisma
model service_search_logs {
  id          Int      @id @default(autoincrement())
  service_id  Int
  service     services @relation(fields: [service_id], references: [id])
  region      String
  zipcode     String?
  searched_at DateTime @default(now())
  
  @@index([service_id, region, searched_at])
}
```

**Reasons:**
- Track every service search with region context
- Weekly cron calculates top searched services per region → update `is_popular`
- Analytics: understand demand patterns
- Index on [service_id, region, searched_at] for fast aggregation queries

---

#### C) service_requests

```prisma
model service_requests {
  id          Int        @id @default(autoincrement())
  keyword     String
  zipcode     String?
  region      String?
  customer_id Int?
  customer    customers? @relation(fields: [customer_id], references: [id])
  email_sent  Boolean    @default(false)
  reviewed    Boolean    @default(false)
  created_at  DateTime   @default(now())
}
```

**Reasons:**
- Capture searches that yield no results
- Auto-send email to LSM/admin about missing service demand
- LSM dashboard can show "Top 10 requested services we don't have"
- Helps prioritize which services to add or which SPs to onboard
- Track if request was reviewed/actioned

---

#### D) provider_services (Junction Table)

```prisma
model provider_services {
  id          Int               @id @default(autoincrement())
  provider_id Int
  provider    service_providers @relation(fields: [provider_id], references: [id])
  service_id  Int
  service     services          @relation(fields: [service_id], references: [id])
  is_active   Boolean           @default(true)
  created_at  DateTime          @default(now())
  
  @@unique([provider_id, service_id])
}
```

**Reasons:**
- Many-to-many relationship: multiple SPs can offer same service
- Platform maintains catalog of ~45 services
- SP selects services they offer during signup
- `is_active` flag: SP can temporarily disable a service they offer
- Unique constraint prevents duplicate assignments

---

### 4. Update Existing Tables

#### A) jobs - ADD these fields:

```prisma
model jobs {
  // ... keep all existing fields ...
  
  // NEW FIELDS:
  pending_approval  Boolean   @default(false)
  response_deadline DateTime?
  rejection_reason  String?
  paid_at           DateTime?
  
  // NEW RELATION:
  disputes          disputes[]
}
```

**Field Reasons:**

- **`pending_approval`**: SP edited job, waiting customer approval (negotiation flow)
- **`response_deadline`**: Timestamp when SP must respond by (default: created_at + 1 hour)
- **`rejection_reason`**: Why SP rejected (shown to customer, stored for analytics)
- **`paid_at`**: When SP marked payment as received (Phase 1 manual payment tracking)
- **`disputes[]`**: Track all disputes raised for this job

---

#### B) service_providers - ADD these fields:

```prisma
model service_providers {
  // ... keep all existing fields ...
  
  // NEW FIELDS:
  warnings          Int       @default(0)
  rejection_reason  String?
  approved_at       DateTime?
  is_deleted        Boolean   @default(false)
  deleted_at        DateTime?
  
  // NEW RELATION:
  provider_services provider_services[]
}
```

**Field Reasons:**

- **`warnings`**: Count of timeout warnings (3 warnings → LSM review)
- **`rejection_reason`**: Why LSM rejected onboarding (stored for accountability, sent in email)
- **`approved_at`**: When LSM approved (tracking/analytics)
- **`is_deleted`**: Soft-delete flag (keep rejected SP records for fraud prevention)
- **`deleted_at`**: When soft-deleted
- **`provider_services[]`**: Which services this SP offers (many-to-many)

---

#### C) chat - ADD these fields:

```prisma
model chat {
  // ... keep all existing fields ...
  
  // NEW FIELDS:
  is_deleted  Boolean   @default(false)
  deleted_at  DateTime?
  deleted_by  Int?
  
  // NEW RELATION:
  disputes    disputes[]
}
```

**Field Reasons:**

- **`is_deleted`**: Soft-delete when SP rejects job (audit trail for disputes)
- **`deleted_at`**: When chat was deleted
- **`deleted_by`**: User ID who deleted it (system/SP/customer)
- **`disputes[]`**: All disputes referencing this chat

---

#### D) services - MAJOR RESTRUCTURE:

**BEFORE (SP-owned model):**
```prisma
model services {
  id                    Int                     @id @default(autoincrement())
  name                  String
  description           String?
  category              String
  created_by            Int
  service_provider      service_providers       @relation("created_services", fields: [created_by], references: [id])
  approved_by           Int?
  local_service_manager local_service_managers? @relation("approved_services", fields: [approved_by], references: [id])
  status                ApprovalStatus          @default(pending)
  is_popular            Boolean                 @default(false)
  questions_json        Json?
  created_at            DateTime                @default(now())
  updated_at            DateTime                @updatedAt

  jobs jobs[]
}
```

**AFTER (Catalog model):**
```prisma
model services {
  id             Int            @id @default(autoincrement())
  name           String
  description    String?
  category       String
  questions_json Json?
  status         ApprovalStatus @default(approved)  // Pre-created services = approved
  is_popular     Boolean        @default(false)
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt
  
  provider_services provider_services[]
  jobs              jobs[]
  search_logs       service_search_logs[]
}
```

**Changes:**

- ❌ **REMOVED:** `created_by`, `service_provider` relation (no longer SP-owned)
- ❌ **REMOVED:** `approved_by`, `local_service_manager` relation (pre-created services are already approved)
- ✅ **ADDED:** `provider_services[]` relation (many-to-many with SPs)
- ✅ **ADDED:** `search_logs[]` relation (track searches)
- ✅ **CHANGED:** `status` default to `approved` (platform pre-creates 45 approved services)

**Reason:** Services are now platform-owned catalog, not SP-created listings.

---

#### E) customers - ADD this relation:

```prisma
model customers {
  // ... keep all existing fields ...
  
  // NEW RELATION:
  service_requests service_requests[]
}
```

**Reason:** Track which customer requested missing services.

---

#### F) ratings_feedback - FIX the provider relation:

**BEFORE (broken relation):**
```prisma
model ratings_feedback {
  // ... other fields ...
  service_providers   service_providers? @relation(fields: [service_providersId], references: [id])
  service_providersId Int?
}
```

**AFTER (clean relation):**
```prisma
model ratings_feedback {
  id                 Int               @id @default(autoincrement())
  job_id             Int
  job                jobs              @relation(fields: [job_id], references: [id])
  customer_id        Int
  customer           customers         @relation(fields: [customer_id], references: [id])
  provider_id        Int
  provider           service_providers @relation(fields: [provider_id], references: [id])
  rating             Int?              @default(0)
  feedback           String?
  punctuality_rating Int?              @default(0)
  response_time      Int?              @default(0)
  created_at         DateTime          @default(now())
}
```

**Reason:** Cleaner naming, proper required relation (not optional).

---

## Implementation Notes

### Migration Strategy

1. **Backup database** before running migration
2. **Data migration for services table:**
   - Since structure changed from SP-owned to catalog, need to handle existing service records
   - Option A: Drop all existing services, pre-populate 45 platform services
   - Option B: Migrate existing → create junction records in `provider_services`
3. **Run migration:** `npx prisma migrate dev --name phase_1_schema_updates`
4. **Seed 45 platform services** if starting fresh

### Things to Handle After Migration

1. **Update existing endpoints** that query services (now need to join through `provider_services`)
2. **Update SP onboarding flow** to use service selection from catalog
3. **Add search logging** middleware to track searches
4. **Build weekly cron job** for popularity calculation
5. **Update frontend** to handle new fields (pending_approval, warnings, etc.)

### Phase 2 Deferred Items

- ❌ Offices/booking system
- ❌ Automated payment gateway integration
- ❌ Customer retention metrics table
- ❌ `service_region_popularity` cached table (using logs for now)
- ❌ Hard-delete old chats (90-day cleanup cron)

---

## Next Steps

### 1. Immediate: Update Prisma Schema
- Apply all changes listed above
- Run `npx prisma format` to check syntax
- Review migration plan

### 2. After Schema Update: Discuss Backend APIs
Once schema is finalized, we'll design:
- **Customer Flow APIs:** search, job submission, approval, feedback
- **Service Provider Flow APIs:** onboarding, job response, negotiation, payment marking
- **LSM Flow APIs:** approval queue, disputes, SP management
- **Admin Flow APIs:** LSM creation, ban approvals, config
- **Chat/Real-time APIs:** WebSocket for messaging

### 3. Architecture Decisions Still Needed
- WebSocket implementation (Socket.IO vs native)
- Email service provider (SendGrid, AWS SES, SMTP)
- Background job scheduling (cron, Bull queue, etc.)
- File upload strategy for attachments (S3, local storage)

---

## Key Principles Established

1. ✅ **Soft-delete over hard-delete** for audit trails
2. ✅ **Store reasons for actions** (rejection_reason, resolution_notes) for accountability
3. ✅ **Track timestamps** for analytics (approved_at, resolved_at, paid_at)
4. ✅ **Region-specific behavior** (popularity, LSM assignment)
5. ✅ **Manual override allowed** (admin can toggle popularity, approve/reject)
6. ✅ **Simple first, optimize later** (logs table now, cached table in Phase 2)
7. ✅ **Keep Phase 1 minimal** (manual payments, basic workflows, no complex features)

---

## Questions Answered in This Discussion

| Question | Answer |
|----------|--------|
| Track job negotiation history? | No - happens in chat, just use `pending_approval` flag |
| Separate warnings table? | No - use integer field on service_providers |
| Service requests table needed? | Yes - for LSM analytics and prioritization |
| Soft-delete or hard-delete chats? | Soft-delete for audit trail |
| Keep rejected SP records? | Yes - fraud prevention and accountability |
| Store rejection reasons? | Yes - accountability and analytics |
| Popularity global or regional? | Regional |
| Admin override for popularity? | Yes |
| SP-owned services or catalog? | Catalog with many-to-many |
| Need closed_deal_at timestamp? | No - visible in chat already |

---

**End of Document**

*For continuation in future chats: Reference this document to understand all schema decisions and the reasoning behind them. Schema is now ready for implementation.*

