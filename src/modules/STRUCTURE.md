# STM Backend Architecture & API Design


Project Structure

```
stm-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── twilio.ts
│   │   └── stripe.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── dto/
│   │   │   └── guards/
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.routes.ts
│   │   │   └── dto/
│   │   ├── customers/
│   │   ├── providers/
│   │   ├── lsm/
│   │   ├── admin/
│   │   ├── jobs/
│   │   ├── payments/
│   │   ├── ratings/
│   │   ├── chat/
│   │   ├── notifications/
│   │   ├── services/
│   │   ├── office-spaces/
│   │   └── analytics/
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── utils/
│   │   │   ├── response.util.ts
│   │   │   ├── encryption.util.ts
│   │   │   └── pagination.util.ts
│   │   ├── interfaces/
│   │   └── constants/
│   ├── jobs/ (background jobs)
│   │   ├── email.job.ts
│   │   ├── sms.job.ts
│   │   └── metrics.job.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 4. Core API Modules & Endpoints


### 4.1 User Management Module (`/api/v1/users`)

**Endpoints:**
```
GET    /users/profile               # Get current user profile
PUT    /users/profile               # Update profile
PUT    /users/change-password       # Change password
DELETE /users/account               # Deactivate account
```

---

### 4.2 Customer Module (`/api/v1/customers`)

**Endpoints:**
```
GET    /customers/:id               # Get customer details
PUT    /customers/:id               # Update customer info
GET    /customers/:id/jobs          # Get customer job history
GET    /customers/:id/metrics       # Get retention metrics
GET    /customers/:id/ratings       # Get ratings given by customer
```

---

### 4.3 Service Provider Module (`/api/v1/providers`)

**Endpoints:**
```
POST   /providers/onboard           # Provider onboarding
GET    /providers                   # List all providers (filtered)
GET    /providers/:id               # Get provider details
PUT    /providers/:id               # Update provider info
PUT    /providers/:id/status        # Update provider status (LSM/Admin)
GET    /providers/:id/jobs          # Get provider job history
GET    /providers/:id/metrics       # Get performance metrics
GET    /providers/:id/earnings      # Get earnings dashboard
POST   /providers/:id/tier          # Update provider tier (Admin/LSM)
GET    /providers/search            # Search providers with filters
```

**Search Filters:**
- Service type
- Location/region
- Availability
- Rating (min threshold)
- Tier (Bronze, Silver, Gold, PESP)
- Price range

---

### 4.4 LSM Module (`/api/v1/lsm`)

**Endpoints:**
```
GET    /lsm/providers               # Get all providers in region
PUT    /lsm/providers/:id/verify    # Verify provider
GET    /lsm/jobs                    # Get all jobs in region
GET    /lsm/metrics                 # Get regional metrics
POST   /lsm/logs                    # Create LSM action log
GET    /lsm/refunds                 # Get refund requests
PUT    /lsm/refunds/:id             # Process refund
GET    /lsm/services/pending        # Get pending service approvals
PUT    /lsm/services/:id/approve    # Approve service
PUT    /lsm/services/:id/reject     # Reject service
```

---

### 4.5 Admin Module (`/api/v1/admin`)

**Endpoints:**
```
GET    /admin/dashboard             # Get admin dashboard stats
GET    /admin/users                 # Get all users
PUT    /admin/users/:id/role        # Update user role
GET    /admin/providers             # Get all providers
PUT    /admin/providers/:id/status  # Ban/activate provider
GET    /admin/jobs                  # Get all jobs
GET    /admin/payments              # Get payment analytics
GET    /admin/analytics             # Platform-wide analytics
PUT    /admin/churn-threshold       # Update churn threshold
GET    /admin/services              # Get all services
POST   /admin/services              # Create new service category
```

---

### 4.6 Job Management Module (`/api/v1/jobs`)

**Endpoints:**
```
POST   /jobs                        # Create new job
GET    /jobs                        # List jobs (with filters)
GET    /jobs/:id                    # Get job details
PUT    /jobs/:id                    # Update job
PUT    /jobs/:id/assign             # Assign job to provider
PUT    /jobs/:id/status             # Update job status
POST   /jobs/:id/quote              # Provider submits quote
PUT    /jobs/:id/accept-quote       # Customer accepts quote
PUT    /jobs/:id/reject-quote       # Customer rejects quote
POST   /jobs/:id/reschedule         # Reschedule job
DELETE /jobs/:id                    # Cancel job
GET    /jobs/:id/history            # Get job action history
POST   /jobs/:id/visit-request      # Request in-person visit
```

**Job Status Flow:**
1. `pending` → Job created by customer
2. `assigned` → Provider submits conditions/price
3. `in_progress` → Customer accepts, work begins
4. `completed` → Work finished
5. `cancelled` → Cancelled by either party

**Query Filters:**
- Customer ID
- Provider ID
- Status
- Service type
- Date range
- Location

---

### 4.7 Services Module (`/api/v1/services`)

**Endpoints:**
```
POST   /services                    # Provider creates new service
GET    /services                    # List all approved services
GET    /services/:id                # Get service details
PUT    /services/:id                # Update service (creator only)
DELETE /services/:id                # Delete service (creator only)
GET    /services/pending            # Get pending approvals (LSM)
GET    /services/my-services        # Get provider's services
```

**Service Approval Flow:**
1. Provider creates service → `status: pending`
2. LSM reviews → `status: approved` or `rejected`
3. Only approved services visible in customer search

---

### 4.8 Provider Services Module (`/api/v1/provider-services`)

**Endpoints:**
```
POST   /provider-services           # Link provider to service with pricing
GET    /provider-services/:providerId # Get all services offered by provider
PUT    /provider-services/:providerId/:serviceId # Update pricing
DELETE /provider-services/:providerId/:serviceId # Remove service offering
```

---

### 4.9  Payment Module (`/api/v1/payments`)

**Endpoints:**
```
POST   /payments                    # Create payment
GET    /payments/:id                # Get payment details
PUT    /payments/:id/status         # Update payment status
GET    /payments/job/:jobId         # Get payments for job
GET    /payments/provider/:id       # Get provider payments
POST   /payments/:id/refund         # Initiate refund request
GET    /payments/invoices           # Get invoices
POST   /payments/process            # Process payment via Stripe/PayPal
POST   /payments/webhook            # Payment gateway webhook
```

---

### 4.10 Refunds Module (`/api/v1/refunds`)

**Endpoints:**
```
POST   /refunds                     # Create refund request
GET    /refunds                     # List refunds (LSM/Admin)
GET    /refunds/:id                 # Get refund details
PUT    /refunds/:id/approve         # Approve refund (LSM)
PUT    /refunds/:id/reject          # Reject refund (LSM)
```

---

### 4.11 Ratings & Feedback Module (`/api/v1/ratings`)

**Endpoints:**
```
POST   /ratings                     # Submit rating for job
GET    /ratings/job/:jobId          # Get rating for specific job
GET    /ratings/provider/:id        # Get all ratings for provider
GET    /ratings/customer/:id        # Get ratings given by customer
PUT    /ratings/:id                 # Update rating (within time limit)
DELETE /ratings/:id                 # Delete rating (admin only)
```

**Rating Structure:**
- Overall rating: 1-5 stars
- Punctuality: 1-5 stars
- Response time: In minutes
- Feedback: Text

---

### 4.12 Chat Module (`/api/v1/chat`)

**Endpoints:**
```
POST   /chat                        # Create new chat
GET    /chat/:id                    # Get chat details
GET    /chat/job/:jobId             # Get chat for job
POST   /chat/:id/messages           # Send message
GET    /chat/:id/messages           # Get message history
PUT    /chat/:id/close              # Close chat
```

**Real-time with Socket.io:**
```javascript
// Events
socket.on('join_chat', { chatId })
socket.on('send_message', { chatId, message })
socket.on('typing', { chatId })
socket.emit('new_message', { message })
socket.emit('user_typing', { userId })
```

---

### 4.13 Call Logs Module (`/api/v1/calls`)

**Endpoints:**
```
POST   /calls                       # Log call
GET    /calls/:id                   # Get call details
GET    /calls/job/:jobId            # Get calls for job
POST   /calls/twilio-webhook        # Twilio webhook for call status
```

---

### 4.14 Notifications Module (`/api/v1/notifications`)

**Endpoints:**
```
GET    /notifications               # Get user notifications
PUT    /notifications/:id/read      # Mark as read
PUT    /notifications/read-all      # Mark all as read
DELETE /notifications/:id           # Delete notification
POST   /notifications/preferences   # Update notification preferences
```

**Notification Types:**
- Job updates
- Payment confirmations
- New messages
- Rating received
- System alerts

**Channels:**
- In-app
- Email
- SMS

---

### 4.15 Office Spaces Module (`/api/v1/office-spaces`)

**Endpoints:**
```
POST   /office-spaces               # Create office space (Admin)
GET    /office-spaces               # List office spaces
GET    /office-spaces/:id           # Get office details
PUT    /office-spaces/:id           # Update office space
DELETE /office-spaces/:id           # Delete office space
GET    /office-spaces/search        # Search with filters
POST   /office-spaces/:id/book      # Book office space
GET    /office-spaces/bookings      # Get bookings
PUT    /office-spaces/bookings/:id  # Update booking status
```

---

### 4.16 Analytics Module (`/api/v1/analytics`)

**Endpoints:**
```
GET    /analytics/provider/:id      # Provider analytics
GET    /analytics/customer/:id      # Customer analytics
GET    /analytics/regional          # Regional analytics (LSM)
GET    /analytics/platform          # Platform-wide (Admin)
GET    /analytics/market-data       # Market pricing trends
GET    /analytics/retention         # Customer retention metrics
```


