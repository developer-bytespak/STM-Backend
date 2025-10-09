# 🎛️ Admin Dashboard Features - STM Backend

Based on your backend capabilities, here's a complete feature list for your admin dashboard.

---

## 📊 Priority Levels

- 🔴 **P0 (Critical)** - Essential for platform operation
- 🟡 **P1 (High)** - Important for daily management
- 🟢 **P2 (Medium)** - Nice to have, improves efficiency
- 🔵 **P3 (Low)** - Future enhancements

---

## 🏠 1. DASHBOARD HOME (Overview)

### 🔴 P0 - Critical Metrics
```
┌─────────────────────────────────────────────┐
│  TODAY'S METRICS                            │
├─────────────────────────────────────────────┤
│  📊 Active Jobs: 45                         │
│  👥 Active Users: 1,234                     │
│  💰 Revenue Today: $5,678                   │
│  ⚠️  Pending Approvals: 8                   │
└─────────────────────────────────────────────┘
```

**Backend Endpoints:**
- `GET /admin/stats/overview` (Need to create)
- Count from various tables

**Data to Show:**
- Total active jobs (status: new, in_progress)
- Total revenue (sum of completed jobs)
- Pending service requests
- Pending provider documents
- New user registrations today

---

### 🟡 P1 - Quick Actions Panel
```
┌─────────────────────────────────────────────┐
│  QUICK ACTIONS                              │
├─────────────────────────────────────────────┤
│  [Create LSM]  [View Requests]  [Services]  │
└─────────────────────────────────────────────┘
```

**Features:**
- Quick button to create new LSM
- View pending service requests (badge count)
- Manage services shortcut
- View disputes/complaints

---

### 🟡 P1 - Real-time Activity Feed
```
┌─────────────────────────────────────────────┐
│  RECENT ACTIVITY                            │
├─────────────────────────────────────────────┤
│  🟢 New job created by Jane Smith - 2m ago  │
│  📄 Provider uploaded document - 5m ago     │
│  ✅ LSM approved service request - 10m ago  │
│  💰 Payment received - 15m ago              │
└─────────────────────────────────────────────┘
```

**Backend:**
- Use notifications table
- Filter by type: job, document, service request, payment

---

## 👥 2. USER MANAGEMENT

### 🔴 P0 - Users List & Search
```
┌──────────────────────────────────────────────────────────┐
│  USERS                                   [+ Add User]     │
├──────────────────────────────────────────────────────────┤
│  Search: [___________]  Role: [All ▼]  Status: [All ▼]   │
├──────────────────────────────────────────────────────────┤
│  ID │ Name          │ Email           │ Role    │ Status │
│  1  │ John Doe      │ john@test.com   │ Customer│ Active │
│  2  │ Jane Provider │ jane@prov.com   │ Provider│ Active │
│  3  │ Lisa Manager  │ lisa@lsm.com    │ LSM     │ Active │
└──────────────────────────────────────────────────────────┘
```

**Backend Endpoints (Need to create):**
```http
GET /admin/users?search=&role=&status=&page=1&limit=20
GET /admin/users/:id
PUT /admin/users/:id/status  # activate/deactivate
DELETE /admin/users/:id       # soft delete
```

**Features:**
- Search by name, email, phone
- Filter by role (Customer, Provider, LSM, Admin)
- Filter by status (Active, Inactive, Banned)
- Pagination
- Sort by: created_at, last_login, total_jobs

**Actions per User:**
- View full profile
- Edit user info
- Deactivate/Activate account
- Reset password
- View activity history

---

### 🟡 P1 - User Details View
```
┌─────────────────────────────────────────────┐
│  USER DETAILS - John Doe (#123)             │
├─────────────────────────────────────────────┤
│  📧 Email: john@test.com                    │
│  📱 Phone: +1234567890                      │
│  📅 Joined: Jan 1, 2025                     │
│  🔐 Role: Customer                          │
│  ✅ Email Verified: Yes                     │
│  🕐 Last Login: 2 hours ago                 │
├─────────────────────────────────────────────┤
│  STATS                                      │
│  Total Jobs: 15                             │
│  Total Spent: $2,340                        │
│  Active Jobs: 2                             │
├─────────────────────────────────────────────┤
│  [Edit] [Deactivate] [Reset Password]      │
└─────────────────────────────────────────────┘
```

**Backend:**
```http
GET /admin/users/:id/stats
GET /admin/users/:id/jobs
GET /admin/users/:id/activity
```

---

## 🔧 3. SERVICE PROVIDER MANAGEMENT

### 🔴 P0 - Provider List & Filtering
```
┌──────────────────────────────────────────────────────────────────┐
│  SERVICE PROVIDERS                          [+ Add Provider]     │
├──────────────────────────────────────────────────────────────────┤
│  Search: [___]  Region: [All ▼]  Status: [All ▼]  Rating: [All ▼]│
├──────────────────────────────────────────────────────────────────┤
│  ID │ Business Name    │ Region   │ Rating │ Jobs │ Status       │
│  1  │ ABC Plumbing     │ New York │ 4.8★   │ 156  │ Active       │
│  2  │ XYZ Electric     │ LA       │ 4.5★   │ 89   │ Pending      │
│  3  │ Quick Fix Co     │ Chicago  │ 3.2★   │ 12   │ Active       │
└──────────────────────────────────────────────────────────────────┘
```

**Existing Backend:**
```http
GET /lsm/providers  # You have this for LSM
```

**Need to Create:**
```http
GET /admin/providers?search=&region=&status=&rating=&page=1
GET /admin/providers/:id
PUT /admin/providers/:id
POST /admin/providers/:id/ban      # Already exists ✅
POST /admin/providers/:id/unban    # Already exists ✅
```

**Features:**
- Filter by: region, status, rating range
- Sort by: rating, total_jobs, earnings, created_at
- Quick actions: Ban, Verify, View Details

---

### 🔴 P0 - Provider Details Page
```
┌─────────────────────────────────────────────────────────────┐
│  PROVIDER DETAILS - ABC Plumbing (#1)                       │
├─────────────────────────────────────────────────────────────┤
│  👤 Owner: John Provider                                    │
│  📧 Email: john@abc.com    📱 Phone: +1234567890           │
│  📍 Location: New York, NY (10001)                          │
│  💼 Experience: 5 years                                     │
│  ⭐ Rating: 4.8 (156 reviews)                              │
│  👔 Managed By: Lisa Manager (LSM #1)                       │
│  📅 Joined: Jan 1, 2025    ✅ Approved: Jan 5, 2025        │
├─────────────────────────────────────────────────────────────┤
│  STATISTICS                                                 │
│  Total Jobs: 156    Completed: 145    Cancelled: 11        │
│  Total Earnings: $45,678    Avg Job Value: $315            │
│  Response Rate: 95%    Acceptance Rate: 87%                │
├─────────────────────────────────────────────────────────────┤
│  SERVICES OFFERED (3)                                       │
│  ✓ Toilet Clog    ✓ Sink Repair    ✓ Pipe Installation    │
├─────────────────────────────────────────────────────────────┤
│  DOCUMENTS (2/2 verified)                                   │
│  ✅ Business License - Verified on Jan 5, 2025             │
│  ✅ Insurance Certificate - Verified on Jan 5, 2025        │
├─────────────────────────────────────────────────────────────┤
│  RECENT JOBS (Last 10)                                      │
│  Job #123 - Toilet Repair - $150 - Completed               │
│  Job #122 - Sink Clog - $120 - In Progress                 │
├─────────────────────────────────────────────────────────────┤
│  [Edit] [Ban Provider] [View All Jobs] [Message]           │
└─────────────────────────────────────────────────────────────┘
```

**Backend:**
```http
GET /admin/providers/:id/stats
GET /admin/providers/:id/documents
GET /admin/providers/:id/services
GET /admin/providers/:id/jobs
GET /admin/providers/:id/reviews
```

---

### 🟡 P1 - Provider Document Verification
```
┌─────────────────────────────────────────────┐
│  PENDING DOCUMENTS (8)                      │
├─────────────────────────────────────────────┤
│  Provider: ABC Plumbing                     │
│  Document: Business License                 │
│  Uploaded: 2 hours ago                      │
│  [View] [Approve] [Reject]                  │
├─────────────────────────────────────────────┤
│  Provider: XYZ Electric                     │
│  Document: Insurance                        │
│  Uploaded: 5 hours ago                      │
│  [View] [Approve] [Reject]                  │
└─────────────────────────────────────────────┘
```

**Backend:**
```http
GET /admin/documents/pending
POST /admin/documents/:id/verify   # Need to create
POST /admin/documents/:id/reject   # Need to create
```

---

## 🛠️ 4. SERVICE MANAGEMENT

### 🔴 P0 - Services List
```
┌──────────────────────────────────────────────────────────────┐
│  SERVICES                                   [+ Add Service]  │
├──────────────────────────────────────────────────────────────┤
│  Search: [___]  Category: [All ▼]  Status: [All ▼]          │
├──────────────────────────────────────────────────────────────┤
│  ID │ Name           │ Category │ Providers │ Jobs │ Status  │
│  1  │ Toilet Clog    │ Plumber  │ 45        │ 234  │ Active  │
│  2  │ Sink Repair    │ Plumber  │ 38        │ 189  │ Active  │
│  3  │ Pool Cleaning  │ Exterior │ 12        │ 56   │ Active  │
└──────────────────────────────────────────────────────────────┘
```

**Existing Backend:**
```http
GET /admin/services                # Already exists ✅
PUT /admin/services/:id            # Already exists ✅
DELETE /admin/services/:id         # Already exists ✅
```

**Features:**
- View all services
- Edit service details
- Deactivate service (if no active jobs)
- View providers offering this service
- View job statistics

---

### 🔴 P0 - Service Request Approvals
```
┌─────────────────────────────────────────────────────────────┐
│  SERVICE REQUESTS - PENDING APPROVAL                        │
├─────────────────────────────────────────────────────────────┤
│  Pool Cleaning - Requested by ABC Services                 │
│  Category: Exterior Cleaner                                 │
│  LSM Approved: ✅ Yes (Lisa Manager)                        │
│  Description: Professional pool cleaning...                 │
│  [View Details] [Approve & Create] [Reject]                 │
├─────────────────────────────────────────────────────────────┤
│  Gutter Cleaning - Requested by XYZ Maintenance            │
│  Category: Exterior Cleaner                                 │
│  LSM Approved: ⏳ Pending                                   │
│  Description: Gutter cleaning and repair...                 │
│  [View Details] [Waiting for LSM]                           │
└─────────────────────────────────────────────────────────────┘
```

**Existing Backend:**
```http
GET /admin/service-requests/pending        # Already exists ✅
POST /admin/service-requests/:id/approve   # Already exists ✅
POST /admin/service-requests/:id/reject    # Already exists ✅
```

---

### 🟡 P1 - Service Details & Analytics
```
┌─────────────────────────────────────────────┐
│  SERVICE DETAILS - Toilet Clog (#1)         │
├─────────────────────────────────────────────┤
│  Category: Plumber                          │
│  Status: Active                             │
│  Created: Jan 1, 2025                       │
│  Popular: ⭐ Yes                            │
├─────────────────────────────────────────────┤
│  STATISTICS                                 │
│  Total Providers: 45                        │
│  Active Jobs: 23                            │
│  Completed Jobs: 211                        │
│  Avg Price: $185                            │
│  Avg Rating: 4.6★                           │
├─────────────────────────────────────────────┤
│  QUESTIONS (2)                              │
│  • Urgency Level (Emergency/Regular)        │
│  • Toilet Type (Standard/Wall-mounted)      │
├─────────────────────────────────────────────┤
│  TOP PROVIDERS                              │
│  1. ABC Plumbing - 45 jobs - 4.9★           │
│  2. Quick Fix - 38 jobs - 4.7★              │
├─────────────────────────────────────────────┤
│  [Edit] [View Jobs] [Deactivate]            │
└─────────────────────────────────────────────┘
```

---

## 📋 5. JOB MANAGEMENT

### 🔴 P0 - Jobs Overview
```
┌──────────────────────────────────────────────────────────────────┐
│  JOBS                                                            │
├──────────────────────────────────────────────────────────────────┤
│  Status: [All ▼]  Service: [All ▼]  Region: [All ▼]  Date: [▼]  │
├──────────────────────────────────────────────────────────────────┤
│  ID  │ Service      │ Customer  │ Provider  │ Status      │ $    │
│  123 │ Toilet Clog  │ Jane S.   │ ABC Plumb │ In Progress │ $150 │
│  122 │ Sink Repair  │ John D.   │ XYZ Fix   │ New         │ $120 │
│  121 │ Pipe Install │ Mary J.   │ Quick Fix │ Completed   │ $450 │
└──────────────────────────────────────────────────────────────────┘
```

**Need to Create:**
```http
GET /admin/jobs?status=&service=&region=&page=1&limit=20
GET /admin/jobs/:id
PUT /admin/jobs/:id/status  # Force status change
DELETE /admin/jobs/:id      # Cancel job
```

**Features:**
- Filter by: status, service type, region, date range
- Sort by: created_at, scheduled_at, price
- Quick status badges
- Actions: View Details, Cancel, Reassign

---

### 🟡 P1 - Job Details
```
┌─────────────────────────────────────────────┐
│  JOB DETAILS - #123                         │
├─────────────────────────────────────────────┤
│  Service: Toilet Clog                       │
│  Status: In Progress                        │
│  Price: $150                                │
│  Created: Oct 8, 2025 10:00 AM              │
│  Scheduled: Oct 15, 2025 2:00 PM            │
├─────────────────────────────────────────────┤
│  CUSTOMER                                   │
│  Jane Smith (#4)                            │
│  📱 +1234567893                             │
│  📍 123 Main St, New York, NY               │
├─────────────────────────────────────────────┤
│  PROVIDER                                   │
│  ABC Plumbing (#1)                          │
│  📱 +1234567892                             │
│  ⭐ Rating: 4.8                             │
├─────────────────────────────────────────────┤
│  TIMELINE                                   │
│  ✅ Created - Oct 8, 10:00 AM               │
│  ✅ Accepted - Oct 8, 10:05 AM              │
│  ⏳ In Progress - Oct 8, 10:10 AM           │
│  ⏹️  Not Completed Yet                      │
├─────────────────────────────────────────────┤
│  ANSWERS                                    │
│  Urgency: Emergency                         │
│  Toilet Type: Standard                      │
├─────────────────────────────────────────────┤
│  [View Chat] [Cancel Job] [Force Complete] │
└─────────────────────────────────────────────┘
```

---

## 👔 6. LSM MANAGEMENT

### 🔴 P0 - LSM List
```
┌──────────────────────────────────────────────────────────────┐
│  LOCAL SERVICE MANAGERS                    [+ Create LSM]    │
├──────────────────────────────────────────────────────────────┤
│  ID │ Name          │ Region    │ Providers │ Jobs │ Status  │
│  1  │ Lisa Manager  │ New York  │ 45        │ 234  │ Active  │
│  2  │ Bob Manager   │ LA        │ 38        │ 189  │ Active  │
│  3  │ Sara Manager  │ Chicago   │ 32        │ 156  │ Active  │
└──────────────────────────────────────────────────────────────┘
```

**Existing Backend:**
```http
POST /admin/lsm/create  # Already exists ✅
```

**Need to Create:**
```http
GET /admin/lsms
GET /admin/lsms/:id
PUT /admin/lsms/:id
DELETE /admin/lsms/:id  # Deactivate
```

---

### 🟡 P1 - LSM Details & Performance
```
┌─────────────────────────────────────────────┐
│  LSM DETAILS - Lisa Manager (#1)            │
├─────────────────────────────────────────────┤
│  Region: New York                           │
│  Status: Active                             │
│  Joined: Jan 1, 2025                        │
│  📧 lisa@lsm.com                            │
│  📱 +1234567891                             │
├─────────────────────────────────────────────┤
│  STATISTICS                                 │
│  Providers Managed: 45                      │
│  Total Jobs: 234                            │
│  Service Requests Reviewed: 67              │
│  Documents Verified: 123                    │
│  Approval Rate: 89%                         │
├─────────────────────────────────────────────┤
│  RECENT ACTIVITY                            │
│  ✅ Approved service request - 2h ago       │
│  ✅ Verified document - 5h ago              │
│  ✅ Approved provider - 1d ago              │
├─────────────────────────────────────────────┤
│  [Edit] [View Region] [Deactivate]          │
└─────────────────────────────────────────────┘
```

---

## 👤 7. CUSTOMER MANAGEMENT

### 🟡 P1 - Customer List
```
┌──────────────────────────────────────────────────────────────┐
│  CUSTOMERS                                                   │
├──────────────────────────────────────────────────────────────┤
│  Search: [___]  Region: [All ▼]  Status: [All ▼]            │
├──────────────────────────────────────────────────────────────┤
│  ID │ Name       │ Email         │ Jobs │ Spent  │ Joined   │
│  1  │ Jane Smith │ jane@test.com │ 15   │ $2,340 │ Jan 2025 │
│  2  │ John Doe   │ john@test.com │ 8    │ $1,200 │ Feb 2025 │
└──────────────────────────────────────────────────────────────┘
```

**Existing Backend:**
```http
GET /customers  # You have this ✅
GET /customers/:id  # You have this ✅
```

**Need to Create:**
```http
GET /admin/customers/stats
GET /admin/customers/:id/jobs
```

---

### 🟢 P2 - Customer Insights
```
┌─────────────────────────────────────────────┐
│  CUSTOMER INSIGHTS - Jane Smith (#1)        │
├─────────────────────────────────────────────┤
│  Total Jobs: 15                             │
│  Total Spent: $2,340                        │
│  Avg Job Value: $156                        │
│  Active Jobs: 2                             │
│  Cancelled Jobs: 1                          │
├─────────────────────────────────────────────┤
│  FAVORITE SERVICES                          │
│  1. Toilet Clog - 6 bookings                │
│  2. Sink Repair - 4 bookings                │
│  3. Pipe Install - 3 bookings               │
├─────────────────────────────────────────────┤
│  PREFERRED PROVIDERS                        │
│  1. ABC Plumbing - 8 jobs                   │
│  2. Quick Fix - 4 jobs                      │
└─────────────────────────────────────────────┘
```

---

## 📊 8. ANALYTICS & REPORTS

### 🟡 P1 - Dashboard Analytics
```
┌─────────────────────────────────────────────────────────────┐
│  ANALYTICS OVERVIEW                         [Last 30 Days]  │
├─────────────────────────────────────────────────────────────┤
│  REVENUE                                                    │
│  Total: $156,789    ↗️ +23% vs last month                  │
│  [Revenue Chart - Line Graph]                               │
├─────────────────────────────────────────────────────────────┤
│  JOBS                                                       │
│  Total: 1,234    Completed: 1,156    Cancelled: 78         │
│  [Jobs Chart - Bar Graph]                                   │
├─────────────────────────────────────────────────────────────┤
│  USERS                                                      │
│  New Customers: 156    New Providers: 23                   │
│  [User Growth - Area Chart]                                 │
├─────────────────────────────────────────────────────────────┤
│  TOP SERVICES                                               │
│  1. Toilet Clog - 234 jobs                                  │
│  2. Sink Repair - 189 jobs                                  │
│  3. Pipe Install - 156 jobs                                 │
└─────────────────────────────────────────────────────────────┘
```

**Need to Create:**
```http
GET /admin/analytics/overview?period=30d
GET /admin/analytics/revenue?from=&to=
GET /admin/analytics/jobs?from=&to=
GET /admin/analytics/users?from=&to=
GET /admin/analytics/services/top
GET /admin/analytics/providers/top
GET /admin/analytics/regions/performance
```

**Charts to Include:**
- Revenue over time (line chart)
- Jobs by status (pie chart)
- User growth (area chart)
- Top services (bar chart)
- Provider performance (bar chart)
- Regional performance (map/bar chart)

---

### 🟢 P2 - Advanced Reports
```
┌─────────────────────────────────────────────┐
│  REPORTS                                    │
├─────────────────────────────────────────────┤
│  [Generate Report ▼]                        │
│    • Monthly Revenue Report                 │
│    • Provider Performance Report            │
│    • Service Demand Analysis                │
│    • Customer Retention Report              │
│    • LSM Performance Report                 │
├─────────────────────────────────────────────┤
│  Date Range: [From] [To]                    │
│  Region: [All ▼]                            │
│  [Generate] [Export CSV] [Export PDF]       │
└─────────────────────────────────────────────┘
```

**Need to Create:**
```http
GET /admin/reports/revenue?from=&to=
GET /admin/reports/providers?from=&to=
GET /admin/reports/services?from=&to=
GET /admin/reports/customers?from=&to=
POST /admin/reports/export?type=csv|pdf
```

---

## ⚠️ 9. DISPUTES & COMPLAINTS

### 🟡 P1 - Disputes Management
```
┌─────────────────────────────────────────────────────────────┐
│  DISPUTES                                [Filter: Pending ▼]│
├─────────────────────────────────────────────────────────────┤
│  Job #123 - Toilet Clog                                     │
│  Customer: Jane Smith  vs  Provider: ABC Plumbing           │
│  Raised: 2 hours ago                                        │
│  Issue: "Service not completed properly"                    │
│  [View Details] [Resolve] [Refund]                          │
├─────────────────────────────────────────────────────────────┤
│  Job #118 - Sink Repair                                     │
│  Customer: John Doe  vs  Provider: XYZ Fix                  │
│  Raised: 1 day ago                                          │
│  Issue: "Provider didn't show up"                           │
│  [View Details] [Resolve] [Refund]                          │
└─────────────────────────────────────────────────────────────┘
```

**Backend (Use existing disputes table):**
```http
GET /admin/disputes?status=pending
GET /admin/disputes/:id
PUT /admin/disputes/:id/resolve
POST /admin/disputes/:id/refund
```

---

## 💬 10. CHAT MONITORING

### 🟢 P2 - Chat Oversight
```
┌─────────────────────────────────────────────┐
│  CHAT MONITORING                            │
├─────────────────────────────────────────────┤
│  Active Chats: 45                           │
│  Flagged Chats: 3                           │
│                                             │
│  [View All Chats]                           │
│  [View Flagged]                             │
│  [Search Chats]                             │
└─────────────────────────────────────────────┘
```

**Need to Create:**
```http
GET /admin/chats?status=active|flagged
GET /admin/chats/:id/messages
POST /admin/chats/:id/flag
```

---

## ⭐ 11. RATINGS & REVIEWS

### 🟡 P1 - Reviews Management
```
┌─────────────────────────────────────────────────────────────┐
│  REVIEWS                                  [Filter: All ▼]   │
├─────────────────────────────────────────────────────────────┤
│  ABC Plumbing - 5★ - "Excellent service!"                   │
│  By Jane Smith - Job #123 - 2 hours ago                     │
│  [View] [Flag] [Delete]                                     │
├─────────────────────────────────────────────────────────────┤
│  XYZ Fix - 2★ - "Showed up late"                            │
│  By John Doe - Job #118 - 1 day ago                         │
│  [View] [Flag] [Delete]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Backend (Use ratings_feedback table):**
```http
GET /admin/reviews?rating=&provider=&page=1
GET /admin/reviews/:id
DELETE /admin/reviews/:id  # Remove inappropriate reviews
PUT /admin/reviews/:id/flag
```

---

## 💰 12. PAYMENTS & FINANCIALS

### 🟡 P1 - Payment Overview
```
┌─────────────────────────────────────────────────────────────┐
│  PAYMENTS                                 [This Month]       │
├─────────────────────────────────────────────────────────────┤
│  Total Revenue: $45,678                                     │
│  Pending Payments: $2,340                                   │
│  Refunds Issued: $567                                       │
├─────────────────────────────────────────────────────────────┤
│  RECENT TRANSACTIONS                                        │
│  #TX123 - $150 - Job #123 - Completed - 2h ago              │
│  #TX122 - $120 - Job #122 - Pending - 5h ago                │
│  #TX121 - $450 - Job #121 - Completed - 1d ago              │
└─────────────────────────────────────────────────────────────┘
```

**Need to Create:**
```http
GET /admin/payments?status=&from=&to=
GET /admin/payments/:id
POST /admin/payments/:id/refund
GET /admin/payments/analytics
```

---

## 🔔 13. NOTIFICATIONS

### 🟢 P2 - Notification Center
```
┌─────────────────────────────────────────────┐
│  NOTIFICATIONS                              │
├─────────────────────────────────────────────┤
│  🔔 8 new service requests pending           │
│  ⚠️  3 disputes need attention               │
│  📄 12 documents awaiting verification       │
│  💰 5 payments pending                       │
│                                             │
│  [View All]                                 │
└─────────────────────────────────────────────┘
```

**Backend (Use notifications table):**
```http
GET /admin/notifications?unread=true
PUT /admin/notifications/:id/read
```

---

## ⚙️ 14. SYSTEM SETTINGS

### 🟢 P2 - Platform Configuration
```
┌─────────────────────────────────────────────┐
│  SETTINGS                                   │
├─────────────────────────────────────────────┤
│  GENERAL                                    │
│  Platform Name: STM                         │
│  Support Email: support@stm.com             │
│  Phone: +1-800-123-4567                     │
├─────────────────────────────────────────────┤
│  BUSINESS RULES                             │
│  Job Response Deadline: 1 hour              │
│  Commission Rate: 15%                       │
│  Minimum Job Price: $50                     │
├─────────────────────────────────────────────┤
│  EMAIL TEMPLATES                            │
│  [Edit Welcome Email]                       │
│  [Edit Job Notification]                    │
│  [Edit Payment Receipt]                     │
├─────────────────────────────────────────────┤
│  [Save Changes]                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 RECOMMENDED IMPLEMENTATION PRIORITY

### Phase 1 (Week 1-2) - Core Essentials
1. ✅ Dashboard Home (metrics, quick actions)
2. ✅ Service Management (list, approve requests)
3. ✅ Provider Management (list, ban/unban, documents)
4. ✅ LSM Management (create, list)
5. ✅ Basic Analytics (revenue, jobs count)

### Phase 2 (Week 3-4) - Operations
6. ✅ User Management (search, view, edit)
7. ✅ Job Management (list, view details, cancel)
8. ✅ Service Request Workflow (full approval flow)
9. ✅ Provider Details Page
10. ✅ Customer Management

### Phase 3 (Week 5-6) - Enhanced Features
11. ✅ Advanced Analytics (charts, graphs)
12. ✅ Disputes Management
13. ✅ Reviews Management
14. ✅ Payment Management
15. ✅ Reports Generation

### Phase 4 (Week 7-8) - Nice to Have
16. ✅ Chat Monitoring
17. ✅ Notification Center
18. ✅ System Settings
19. ✅ Advanced Reports
20. ✅ Activity Logs

---

## 🛠️ BACKEND ENDPOINTS YOU NEED TO CREATE

### High Priority
```http
# Analytics
GET  /admin/analytics/overview
GET  /admin/analytics/revenue
GET  /admin/analytics/jobs

# Users
GET  /admin/users
GET  /admin/users/:id
PUT  /admin/users/:id/status

# Providers (Additional)
GET  /admin/providers
GET  /admin/providers/:id/stats
GET  /admin/providers/:id/documents
GET  /admin/providers/:id/jobs

# Jobs
GET  /admin/jobs
GET  /admin/jobs/:id
PUT  /admin/jobs/:id/status

# LSMs (Additional)
GET  /admin/lsms
GET  /admin/lsms/:id

# Disputes
GET  /admin/disputes
GET  /admin/disputes/:id
PUT  /admin/disputes/:id/resolve

# Reviews
GET  /admin/reviews
DELETE /admin/reviews/:id
```

### Medium Priority
```http
# Payments
GET  /admin/payments
POST /admin/payments/:id/refund

# Reports
GET  /admin/reports/revenue
GET  /admin/reports/providers
POST /admin/reports/export

# Documents
GET  /admin/documents/pending
POST /admin/documents/:id/verify

# Chats
GET  /admin/chats
GET  /admin/chats/:id/messages
```

---

## 📱 UI/UX RECOMMENDATIONS

### Design System
- Use **React + TypeScript** for type safety
- **Tailwind CSS** or **Material-UI** for consistent styling
- **Recharts** or **Chart.js** for analytics visualizations
- **React Table** or **TanStack Table** for data tables
- **React Router** for navigation

### Key Components
```typescript
// Components you'll need
- DashboardLayout
- Sidebar
- TopNav
- StatsCard
- DataTable
- FilterBar
- SearchBox
- Modal
- ConfirmDialog
- NotificationBadge
- StatusBadge
- ActionMenu
- Chart Components (Line, Bar, Pie, Area)
- FormComponents
```

### State Management
- **React Query** for server state (fetching, caching)
- **Zustand** or **Redux** for global client state
- **React Hook Form** for form management

---

## 🎨 SAMPLE DASHBOARD MOCKUP

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STM Admin                                         👤 Admin  🔔(8)  🚪 │
├─────────┬───────────────────────────────────────────────────────────────┤
│ 🏠 Home │  DASHBOARD                              Oct 8, 2025 10:30 AM │
│ 👥 Users├───────────────────────────────────────────────────────────────┤
│ 🔧 SPs  │  📊 Active Jobs: 45    👥 Users: 1,234    💰 Revenue: $5,678│
│ 📋 Jobs ├───────────────────────────────────────────────────────────────┤
│ 🛠️  Svcs │  [Revenue Chart - Last 30 Days]                            │
│ 👔 LSMs │                                                               │
│ 📊 Analyt│  [Jobs Chart]          [User Growth Chart]                  │
│ ⚠️  Dispt│                                                               │
│ 💰 Pay  ├───────────────────────────────────────────────────────────────┤
│ ⚙️  Sett │  PENDING ACTIONS                                            │
│         │  • 8 Service Requests awaiting approval                      │
│         │  • 3 Disputes need attention                                 │
│         │  • 12 Documents pending verification                         │
└─────────┴───────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST FOR INTEGRATION

### Backend Setup
- [ ] Create missing admin endpoints
- [ ] Add analytics service
- [ ] Implement payment endpoints
- [ ] Add dispute management
- [ ] Create report generation

### Frontend Setup
- [ ] Set up React project with TypeScript
- [ ] Install UI library (Material-UI/Tailwind)
- [ ] Set up routing (React Router)
- [ ] Configure API client (Axios/Fetch)
- [ ] Set up state management (React Query + Zustand)

### Core Features
- [ ] Dashboard home page
- [ ] User management
- [ ] Provider management
- [ ] Service management
- [ ] Job management
- [ ] LSM management
- [ ] Analytics dashboard

### Testing
- [ ] Test all CRUD operations
- [ ] Test role-based access
- [ ] Test real-time updates
- [ ] Test charts and visualizations
- [ ] Test responsive design

---

**This should give you a complete picture of what to build for your admin dashboard! Start with Phase 1 features and expand from there.** 🚀

