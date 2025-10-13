# 🔧 Cron Job & Search Logic Explanation

## ✅ **Cron Job Fix Applied**

### **The Problem (Before Fix):**
The cron job was checking ALL jobs with `status = 'new'`, which included:
- ❌ Jobs where SP **hasn't responded yet** (correct to timeout)
- ❌ Jobs where SP **already accepted** but customer hasn't closed deal (incorrect to timeout)

**This would cause false timeouts!**

### **The Fix (After):**
Now cron job only checks jobs where SP **hasn't responded**:

```typescript
where: {
  status: 'new',
  sp_accepted: false,      // ✅ SP hasn't accepted yet
  pending_approval: false, // ✅ Not in negotiation
  created_at: { lt: thresholdTime },
  response_deadline: { lt: new Date() },
}
```

---

## 📊 **Job Status Flow (Complete)**

### **Status Lifecycle:**

```
1. Job Created → status = 'new', sp_accepted = false
   ⏱️ Cron checks this (timeout after 65 mins if no SP response)

2a. SP Accepts → status = 'new', sp_accepted = true
   ✅ Cron IGNORES this (SP already responded)

2b. SP Negotiates → status = 'new', pending_approval = true
   ✅ Cron IGNORES this (SP already responded)

2c. SP Rejects → status = 'rejected_by_sp'
   ✅ Cron IGNORES this (not 'new' anymore)

3. Customer Closes Deal → status = 'in_progress'
   ✅ Cron IGNORES this (not 'new' anymore)

4. SP Marks Complete → status = 'completed'

5. SP Marks Payment → status = 'paid'
```

---

## 🔍 **Search Logging vs Request Service**

### **Two Different Features:**

| Feature | Trigger | Purpose | Notifies? |
|---------|---------|---------|-----------|
| **Search Logging** | Automatic (every search) | Analytics, track trends | ❌ No (too spammy) |
| **Request Service** | Manual (button click) | Customer explicitly requests | ✅ Yes (LSM & Admin) |

---

### **1. Search Logging (Automatic, Silent)**

**What it does:**
- Runs on **every search query**
- Logs successful searches to `service_search_logs` table
- Tracks failed searches (no notifications)
- Used for analytics and trend analysis

**Code:** `src/modules/services/search-matching.service.ts` (line 240-313)

**Example:**
```typescript
// Customer searches "pool cleaning" → No results
// System: Logs failed search (no notification)
// Customer searches "plumber" → 5 results
// System: Logs to service_search_logs table
```

**Purpose:**
- Track what people are searching for
- Identify popular services
- Analytics dashboards
- **NO spam notifications** ✅

---

### **2. Request Service (Manual, Explicit)**

**What it does:**
- Customer **clicks a button** "Request this service"
- Creates `service_requests` record
- **Notifies LSM in region**
- **Notifies all admins**
- LSM can then create the service if valid

**Code:** `src/modules/customers/customers.service.ts` (line 1037-1110)

**Endpoint:** `POST /customers/request-service`

**Example Flow:**
```
1. Customer searches "Pool Cleaning" → No results
2. UI shows: "Service not available. Request it?"
3. Customer clicks "Request Service" button
4. Modal opens: "Tell us about the service you need"
5. Customer fills:
   {
     "keyword": "Pool Cleaning",
     "description": "Weekly pool maintenance",
     "region": "Brooklyn",
     "zipcode": "10001"
   }
6. POST /customers/request-service
7. System:
   - Creates service_requests record
   - Notifies LSM in Brooklyn
   - Notifies admins
8. LSM reviews and can create the service
```

**Purpose:**
- Customers **intentionally** request unavailable services
- LSM gets actionable requests
- Admins can prioritize new services
- **Notifications are appropriate** because it's explicit ✅

---

## 🎯 **Why Separate Them?**

### **Search Logging (Silent):**
```
Customer searches "plumbing" → 100 results ✅ (log)
Customer searches "plumber" → 50 results ✅ (log)
Customer searches "plum" → 20 results ✅ (log)
Customer searches "asdf" → 0 results ❌ (log, no notify)
Customer searches "xyz" → 0 results ❌ (log, no notify)
```

**If we notified on every failed search:**
- Admins/LSMs get spammed with random searches
- "asdf", "xyz", typos, etc.
- Not actionable

### **Request Service (Explicit):**
```
Customer searches "pool cleaning" → 0 results
Customer thinks: "I really need this service"
Customer clicks: "Request Pool Cleaning Service"
Customer fills form with details
→ LSM gets 1 actionable request with context ✅
```

**Benefits:**
- Only intentional requests
- Includes description and details
- Actionable for LSM
- No spam

---

## 📋 **Recommended Implementation**

### **Phase 1 (Current):**
✅ Search logging (silent, for analytics)
✅ Request service (explicit, with notifications)

### **Phase 2 (Future Enhancement):**
Track failed search **frequency** and notify:
```sql
-- Track in database
CREATE TABLE failed_search_tracking (
  keyword VARCHAR,
  region VARCHAR,
  search_count INT,
  first_searched_at TIMESTAMP,
  last_searched_at TIMESTAMP
);

-- Logic: Notify if same term searched 10+ times in 7 days
IF (search_count >= 10 AND days_since_first < 7) THEN
  notify_lsm("High demand for: ${keyword} in ${region}");
END IF;
```

**Benefits:**
- Automatic detection of trending demands
- Filters out random/typo searches
- Only notifies for real patterns
- Still less spammy than every search

---

## 🧪 **Testing**

### **Test Cron Job (Correct Behavior):**

```bash
# 1. Create a job
POST /jobs/create
# Response: Job #123 created

# 2. Wait 65+ minutes (or mock the created_at timestamp)
# Cron should flag this as timed out

# 3. Create another job
POST /jobs/create
# Response: Job #124 created

# 4. SP accepts immediately
POST /provider/jobs/124/respond
{ "action": "accept" }

# 5. Wait 65+ minutes
# Cron should NOT flag job #124 (SP already accepted)
# Only job #123 should be flagged
```

### **Test Search Logging:**

```bash
# 1. Search for existing service
GET /services/search?query=plumbing

# Check: service_search_logs table has entry
# Check: NO notifications created ✅

# 2. Search for non-existent service
GET /services/search?query=asdfxyz

# Check: No results returned
# Check: NO notifications created ✅
# Check: Could track in failed_search_tracking (future)
```

### **Test Request Service:**

```bash
# 1. Customer explicitly requests service
POST /customers/request-service
{
  "keyword": "Pool Cleaning",
  "description": "Need weekly pool maintenance",
  "region": "Brooklyn",
  "zipcode": "10001"
}

# Check: service_requests record created
# Check: LSM notification created ✅
# Check: Admin notifications created ✅
```

---

## 📝 **Summary**

### **Cron Job:**
✅ **Fixed** - Only timeouts jobs where SP hasn't responded
✅ Ignores accepted/negotiated/rejected jobs
✅ Checks every 15 minutes
✅ 65-minute threshold (60min deadline + 5min grace)

### **Search Logging:**
✅ Silent tracking for analytics
✅ No spam notifications
✅ Logs to `service_search_logs` table
✅ Can add frequency-based alerts later

### **Request Service:**
✅ Explicit customer action
✅ Creates `service_requests` record
✅ Notifies LSM & Admin (appropriate)
✅ Actionable with context

---

**All systems working correctly!** 🚀

