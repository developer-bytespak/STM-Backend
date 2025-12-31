# Stripe Invoice Integration - Complete Implementation Guide

## ✅ Implementation Complete

All Stripe invoice features have been implemented with **metadata-driven architecture** - no schema changes needed!

---

## 🎯 How Providers Generate Invoices

### **Automatic Invoice Generation - No Form Required**

Providers **DO NOT** fill out any form. The invoice is **automatically generated from job details** stored in your database.

### **Provider Workflow:**

```
1. Customer creates job with service, price, location, and details
   ↓
2. Provider accepts and works on the job
   ↓
3. Provider marks job as COMPLETE
   POST /provider/jobs/:id/update-status
   { "action": "mark_complete" }
   ↓
4. System AUTOMATICALLY:
   - Changes job status to 'completed'
   - Updates payment amount to final job price
   - Calls PaymentService.processJobPayment()
   ↓
5. Backend AUTOMATICALLY generates invoice using:
   - Customer name & email (from database)
   - Service name & description (from database)
   - Job price (from database)
   - Provider info (from database)
   ↓
6. Stripe sends invoice EMAIL to customer automatically
   ↓
7. Customer clicks link → Pays via Stripe → Webhook updates database
```

---

## 🚀 Complete Integration Flow

### **Step 1: Provider Marks Job Complete**

**Endpoint:** `POST /provider/jobs/:id/update-status`

**Request:**
```json
{
  "action": "mark_complete"
}
```

**What Happens:**
1. Job status → `completed`
2. Payment amount → `job.price` (finalized)
3. Payment status → `pending` (awaiting invoice)
4. Customer gets notification: "Job completed, invoice coming"

---

### **Step 2: Provider Sends Invoice** *(Optional - Can be automatic)*

**Endpoint:** `POST /payments/jobs/:jobId/send-invoice`

**What Happens Automatically:**

#### **A. Customer Creation (No form - from database)**
```typescript
// Automatically extracted from job data
const customer = {
  email: job.customer.user.email,      // From users table
  name: "John Doe",                     // From users table
  userId: job.customer.user_id          // Stored in Stripe metadata
}

// Creates Stripe customer or finds existing one
```

#### **B. Invoice Generation (No form - from database)**
```typescript
// Automatically extracted from job data
const invoice = {
  customerId: stripeCustomer.id,
  amount: job.price,                    // From jobs table
  description: "Plumbing - Toilet Clog", // From services table
  dueInDays: 7,                         // Default setting
  metadata: {
    job_id: jobId,                      // Links to your database
    payment_id: paymentId               // Links to your database
  }
}

// Creates invoice, finalizes, and sends email
```

**Response:**
```json
{
  "success": true,
  "invoiceId": "in_1ABC123",
  "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx",
  "invoicePdf": "https://pay.stripe.com/invoice/xxx/pdf",
  "amountDue": 150.00,
  "dueDate": "2025-01-07T00:00:00Z"
}
```

---

### **Step 3: Customer Receives Email & Pays**

**Stripe automatically sends email with:**
- Invoice PDF
- Payment link
- Service details
- Amount due
- Due date

**Customer clicks link → Hosted payment page:**
- Clean, professional Stripe-branded page
- Multiple payment methods (card, Apple Pay, Google Pay, etc.)
- Automatic receipt email after payment

---

### **Step 4: Webhook Updates Database**

**When customer pays, Stripe sends webhook:**

```typescript
Event: invoice.paid

// Backend automatically:
1. Verifies webhook signature (security)
2. Extracts job_id and payment_id from metadata
3. Updates payments table:
   - status = 'received'
   - marked_at = now()
   - method = 'stripe_invoice'
4. Updates jobs table:
   - status = 'paid'
   - paid_at = now()
5. Updates provider earnings
6. Sends notifications to both parties
```

---

## 📋 API Endpoints

### **1. Send Invoice (Provider/Admin)**
```http
POST /payments/jobs/:jobId/send-invoice
Authorization: Bearer {providerToken}
```

**Response:**
```json
{
  "success": true,
  "invoiceId": "in_1ABC123",
  "invoiceUrl": "https://invoice.stripe.com/...",
  "alreadyExists": false
}
```

---

### **2. Get Invoice Details (All Users)**
```http
GET /payments/jobs/:jobId/invoice
Authorization: Bearer {token}
```

**Response:**
```json
{
  "job": {
    "id": 123,
    "service": "Plumbing",
    "status": "completed",
    "price": 150.00
  },
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "payment": {
    "id": 456,
    "amount": 150.00,
    "status": "pending"
  },
  "invoice": {
    "found": true,
    "invoiceId": "in_1ABC123",
    "status": "open",
    "hostedInvoiceUrl": "https://invoice.stripe.com/...",
    "invoicePdf": "https://pay.stripe.com/.../pdf",
    "paid": false,
    "dueDate": "2025-01-07"
  }
}
```

---

### **3. Resend Invoice (Provider/Admin)**
```http
POST /payments/jobs/:jobId/resend-invoice
Authorization: Bearer {providerToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice resent successfully"
}
```

---

### **4. Get Payment History**
```http
GET /payments/history
Authorization: Bearer {token}
```

**Customer Response:**
```json
[
  {
    "id": 1,
    "jobId": 123,
    "service": "Plumbing",
    "provider": "ABC Plumbing",
    "amount": 150.00,
    "status": "received",
    "method": "stripe_invoice",
    "paidAt": "2025-01-01T10:00:00Z"
  }
]
```

---

### **5. Calculate Provider Earnings**
```http
GET /payments/provider/:providerId/earnings
Authorization: Bearer {providerToken}
```

**Response:**
```json
{
  "providerId": 42,
  "totalEarnings": 5240.00,
  "totalJobs": 35,
  "currentBalance": 5240.00
}
```

---

### **6. Stripe Webhook (Automatic)**
```http
POST /payments/stripe/webhook
stripe-signature: {signature}
```

**Handles Events:**
- `invoice.paid` → Update payment to received
- `invoice.payment_failed` → Notify customer to retry
- `invoice.finalized` → Log event
- `invoice.sent` → Log event

---

## 🗄️ Data Storage Strategy

### **Your Database (Existing Schema)**
```sql
jobs:
- id, customer_id, provider_id, price, status, completed_at

payments:
- id, job_id, amount, status, method, marked_at, notes
```

### **Stripe Metadata (No Schema Changes)**
```typescript
// Stripe Customer
{
  id: "cus_ABC123",
  email: "john@example.com",
  metadata: {
    user_id: "789",      // Links to your users table
    platform: "STM"
  }
}

// Stripe Invoice
{
  id: "in_XYZ456",
  metadata: {
    job_id: "123",       // Links to your jobs table
    payment_id: "456",   // Links to your payments table
    platform: "STM"
  }
}
```

**Query Examples:**
```typescript
// Find customer by user_id
stripe.customers.search({ query: "metadata['user_id']:'789'" })

// Find invoice by job_id
stripe.invoices.search({ query: "metadata['job_id']:'123'" })

// Find invoice by payment_id
stripe.invoices.search({ query: "metadata['payment_id']:'456'" })
```

---

## 🔧 Environment Setup

### **1. Add to `.env`**
```env
# Stripe Keys (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **2. Get Webhook Secret**
```bash
# Option 1: Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/payments/stripe/webhook

# Option 2: Dashboard (for production)
# Go to: https://dashboard.stripe.com/test/webhooks
# Add endpoint: https://yourdomain.com/payments/stripe/webhook
# Copy webhook secret
```

---

## 🧪 Testing Guide

### **Step 1: Create Test Job**
```http
POST /jobs
{
  "serviceId": 5,
  "providerId": 42,
  "location": "123 Main St"
}
```

### **Step 2: Mark Job Complete**
```http
POST /provider/jobs/123/update-status
{
  "action": "mark_complete"
}
```

### **Step 3: Send Invoice**
```http
POST /payments/jobs/123/send-invoice
```

### **Step 4: View Invoice (Customer)**
```http
GET /payments/jobs/123/invoice
```

Customer opens `invoiceUrl` and pays with test card:

**Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155

Expiry: Any future date (12/25)
CVC: Any 3 digits (123)
ZIP: Any 5 digits (12345)
```

### **Step 5: Verify Webhook**
```bash
# Check terminal logs for:
"Handling Stripe webhook: invoice.paid"
"Payment success processed for job 123"
```

### **Step 6: Check Database**
```sql
-- Payment should be marked as received
SELECT * FROM payments WHERE job_id = 123;
-- status = 'received', method = 'stripe_invoice'

-- Job should be marked as paid
SELECT * FROM jobs WHERE id = 123;
-- status = 'paid', paid_at = NOW()
```

---

## 🔄 Integration with Existing Code

### **In `providers.service.ts`:**

Update the `updateJobStatus` method to automatically send invoice:

```typescript
async updateJobStatus(userId: number, jobId: number, dto: UpdateJobStatusDto) {
  // ... existing code for mark_complete ...

  if (dto.action === JobStatusAction.MARK_COMPLETE) {
    return await this.prisma.$transaction(async (tx) => {
      // Update job to completed
      const updatedJob = await tx.jobs.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completed_at: new Date(),
        },
      });

      // Update payment amount
      if (job.payment) {
        await tx.payments.update({
          where: { job_id: jobId },
          data: {
            amount: job.price,
            status: 'pending',
          },
        });
      }

      // 🆕 AUTOMATICALLY SEND INVOICE
      try {
        await this.paymentService.processJobPayment(jobId);
      } catch (error) {
        this.logger.error(`Failed to send invoice: ${error.message}`);
        // Don't fail the transaction if invoice fails
      }

      // ... rest of existing code ...
    });
  }
}
```

---

## ✅ Benefits of This Implementation

### **1. Zero Schema Changes**
- Uses existing `payments` and `jobs` tables
- All Stripe data linked via metadata
- Easy to rollback if needed

### **2. Automatic Invoice Generation**
- Provider doesn't fill any form
- All data comes from existing job details
- Consistent, professional invoices

### **3. Real-Time Updates**
- Webhooks update database automatically
- No manual payment marking needed
- Both parties get instant notifications

### **4. Flexible & Scalable**
- Easy to add more metadata fields
- Can track refunds, disputes later
- Works with any number of jobs

### **5. Professional Experience**
- Stripe-hosted payment page
- Multiple payment methods
- Automatic receipts and emails

---

## 🎯 Complete Provider Flow Summary

```
Provider Dashboard:
1. See "Job #123 - Completed" with button "Send Invoice"
2. Click "Send Invoice"
3. System shows: "✅ Invoice sent to john@example.com"
4. Customer gets email immediately
5. Provider waits for payment notification
6. Webhook updates: "✅ Payment received for Job #123"
7. Provider dashboard shows: "Earnings: +$150"
```

**Provider NEVER:**
- Fills out invoice forms
- Enters customer email
- Calculates amounts
- Manually marks payment (webhook does it)

**Provider ONLY:**
- Marks job complete
- Clicks "Send Invoice" button
- Receives payment notification

---

## 🔒 Security Features

1. **Webhook Signature Verification** - Ensures events are from Stripe
2. **Role-Based Access Control** - Only providers can send invoices
3. **Metadata Validation** - All invoices must have job_id and payment_id
4. **Idempotency** - Prevents duplicate invoice creation
5. **PCI Compliance** - Customer never enters card on your site

---

## 📞 Support & Testing

**Test Mode:**
- All endpoints work in test mode
- Use test cards for payments
- Webhook events can be simulated

**Production:**
- Switch to live keys in `.env`
- Configure production webhook URL
- Test with real payment first

**Stripe Dashboard:**
- View all invoices: https://dashboard.stripe.com/test/invoices
- View webhooks: https://dashboard.stripe.com/test/webhooks
- View customers: https://dashboard.stripe.com/test/customers

---

## 🎯 FINAL COMPLETE FLOW (Tested & Production Ready)

### **End-to-End Invoice & Payment System**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PROVIDER SENDS INVOICE                                    │
├─────────────────────────────────────────────────────────────┤
POST /payments/jobs/:jobId/send-invoice
Authorization: Bearer {provider-token}

Response:
{
  "success": true,
  "invoiceId": "in_1SkQ2L5ZHvEqwhA3WhjrZ9xZ",
  "invoiceUrl": "https://invoice.stripe.com/i/...",
  "amountDue": 233
}

What happens:
✅ Stripe invoice created
✅ Payment record updated
✅ Chat message sent to customer with payment link
✅ Notification sent to customer
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. CUSTOMER RECEIVES INVOICE                                 │
├─────────────────────────────────────────────────────────────┤
- Email with invoice link
- Chat message with payment button
- In-app notification

Customer clicks link → Stripe payment page
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK PROCESSES PAYMENT (AUTOMATIC)                    │
├─────────────────────────────────────────────────────────────┤
Stripe sends: POST https://stm-backend-qcaf.onrender.com/webhooks/stripe

Webhook handler:
✅ Verifies Stripe signature
✅ Gets payment_id from invoice metadata
✅ Updates payments table → status: 'received'
✅ Updates jobs table → status: 'paid'
✅ Logs "Payment marked as received"

NO FRONTEND NEEDED - Fully automatic!
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. PROVIDER VIEWS INVOICES                                   │
├─────────────────────────────────────────────────────────────┤
GET /payments/provider/invoices
Authorization: Bearer {provider-token}
Query: ?status=pending|received|disputed (optional)

Response:
{
  "summary": {
    "total": 16,
    "pending": 12,
    "received": 4,
    "disputed": 0,
    "totalAmount": 703
  },
  "invoices": [
    {
      "id": 23,
      "jobId": 23,
      "jobService": "Pool Cleaning",
      "customerName": "John",
      "amount": 20,
      "status": "received",
      "stripeInvoiceUrl": "https://invoice.stripe.com/...",
      "stripePdfUrl": "https://pay.stripe.com/invoice/.../pdf",
      "createdAt": "2025-12-30T20:02:32.080Z",
      "markedAt": "2025-12-31T16:21:16.662Z"
    }
  ]
}

✅ Provider sees all invoices
✅ Can click links to view/download
✅ Filter by status (pending/received/disputed)
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTING COMMANDS

### **Terminal 1: Get Login Token**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider1@test.com",
    "password": "password123"
  }'

# Copy the token from response
```

### **Terminal 2: View All Invoices**
```bash
curl http://localhost:3000/payments/provider/invoices \
  -H "Authorization: Bearer {token}"

# With status filter:
curl "http://localhost:3000/payments/provider/invoices?status=received" \
  -H "Authorization: Bearer {token}"
```

### **Terminal 3: Listen for Webhooks (Local Testing)**
```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

### **Terminal 4: Send Test Invoice**
```bash
curl -X POST http://localhost:3000/payments/jobs/23/send-invoice \
  -H "Authorization: Bearer {token}"
```

---

## 🔧 DATABASE UPDATES

### **On Payment Success (Webhook)**
```sql
-- Payments table
UPDATE payments SET status = 'received', marked_at = NOW() WHERE id = 23;

-- Jobs table
UPDATE jobs SET status = 'paid', paid_at = NOW() WHERE id = 23;
```

### **Data Flow**
```
Stripe Payment → Webhook → Extract payment_id from metadata 
→ Find payment record → Update payments.status = 'received' 
→ Update jobs.status = 'paid' → DONE (No UI needed)
```

---

## 🌐 PRODUCTION DEPLOYMENT

### **1. Stripe Dashboard Configuration**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://stm-backend-qcaf.onrender.com/webhooks/stripe`
4. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.paid`
5. Copy signing secret (starts with `whsec_`)

### **2. Environment Variables**

Add to Render `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_production_secret_from_step1
```

### **3. Deploy**
```bash
git push
# Render auto-deploys on push
```

### **4. Verify Webhook**
```bash
# Test payment through invoice link
# Check Stripe Dashboard → Webhooks → Endpoint details
# Should see ✅ "Processed Successfully"
```

---

## ✨ Implementation Complete!

**All services implemented:**
- ✅ StripeService - Stripe API integration
- ✅ InvoicingService - Business logic layer
- ✅ PaymentService - Payment processing
- ✅ PaymentController - API endpoints
- ✅ WebhookController - Automatic payment processing
- ✅ PaymentModule - Module configuration

**Features:**
- ✅ Automatic invoice generation from job details
- ✅ Chat & email notifications
- ✅ Webhook signature verification
- ✅ Automatic payment status updates
- ✅ Provider invoice dashboard with filtering
- ✅ Production-ready deployment

**No manual steps required - fully automatic invoice generation and payment processing!**
