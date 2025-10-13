# LSM Reject Onboarding Feature

## Overview
LSMs can now reject service provider onboarding applications. When rejected, providers can re-upload documents to resubmit their application.

## API Endpoints

### 1. Reject Provider Onboarding (LSM)
```
POST /lsm/providers/:id/reject-onboarding
```

**Request Body:**
```json
{
  "reason": "Your documents are incomplete. Please provide valid business registration and insurance certificates."
}
```

**Response:**
```json
{
  "id": 4,
  "status": "rejected",
  "rejectionReason": "Your documents are incomplete...",
  "documentsRejected": 3,
  "message": "Provider onboarding rejected. Provider can re-upload documents to resubmit application."
}
```

### 2. Get Providers by Status (LSM)
```
GET /lsm/providers?status=rejected
GET /lsm/providers?status=active
GET /lsm/providers?status=pending
GET /lsm/providers (all statuses)
```

**Response:**
```json
{
  "total": 5,
  "status": "rejected",
  "providers": [
    {
      "id": 4,
      "businessName": "ABC Plumbing",
      "status": "rejected",
      "rejectionReason": "Incomplete documents",
      "rating": 0.0,
      "experience": 10,
      "totalJobs": 0,
      "user": {
        "first_name": "John",
        "last_name": "Smith",
        "email": "john@example.com",
        "phone_number": "+1234567890"
      },
      "serviceAreas": ["10001", "10002"],
      "services": [...],
      "documentCount": 3,
      "jobCount": 0,
      "created_at": "2025-10-10T..."
    }
  ]
}
```

### 3. Upload Document (SP - Triggers Status Change)
```
POST /provider-onboarding/documents/upload
```

**Behavior:**
- If provider status is `rejected`, uploading a document automatically changes status to `pending`
- Documents are marked as `pending` for LSM review
- Provider receives confirmation message

**Response:**
```json
{
  "id": 15,
  "file_name": "business_license.pdf",
  "description": "Updated business license",
  "status": "pending",
  "file_size": 245678,
  "created_at": "2025-10-10T...",
  "provider_status_updated": "pending",
  "message": "Document uploaded successfully. Your application status has been changed to pending for review."
}
```

### 4. Get Provider Profile (SP)
```
GET /provider/profile
```

**Response includes:**
```json
{
  "status": {
    "current": "rejected",
    "rejectionReason": "Incomplete documents. Please provide valid business registration.",
    "warnings": 0,
    "canDeactivate": true,
    "activeJobsCount": 0
  },
  "documents": {
    "total": 3,
    "verified": 0,
    "pending": 0,
    "rejected": 3,
    "list": [...]
  }
}
```

## Workflow

### Initial Rejection Flow
1. **LSM Reviews Application**
   - LSM sees pending provider: `GET /lsm/onboarding/pending`
   - LSM reviews documents: `GET /lsm/providers/:id`
   - LSM rejects with reason: `POST /lsm/providers/4/reject-onboarding`

2. **Provider Status Changes**
   - Provider status: `pending` → `rejected`
   - All documents marked as `rejected`
   - Provider receives notification with rejection reason

3. **Provider Sees Rejection**
   - Provider checks profile: `GET /provider/profile`
   - Sees status: `rejected`
   - Sees rejection reason in `status.rejectionReason`
   - Sees all documents marked as `rejected`

### Resubmission Flow
4. **Provider Re-uploads Documents**
   - Provider deletes old docs (optional): `DELETE /provider-onboarding/documents/:id`
   - Provider uploads new docs: `POST /provider-onboarding/documents/upload`
   - **Status automatically changes**: `rejected` → `pending`

5. **LSM Reviews Again**
   - LSM sees provider back in pending list
   - Can see previous rejection reason (stored in `rejection_reason` field)
   - LSM verifies documents: `POST /lsm/providers/:id/documents/:docId`
   - Once all documents verified: `POST /lsm/providers/:id/approve-onboarding`

6. **Final Approval**
   - Provider status: `pending` → `active`
   - Provider can now receive job requests

## Database Schema Changes

### Updated ProviderStatus Enum
```prisma
enum ProviderStatus {
  pending
  active
  inactive
  banned
  rejected  // NEW
}
```

### service_providers Table
- `status`: Now includes `rejected` option
- `rejection_reason`: Stores LSM's rejection feedback

## Files Modified

1. **prisma/schema.prisma** - Added `rejected` to ProviderStatus enum
2. **src/modules/lsm/dto/reject-onboarding.dto.ts** - New DTO for rejection
3. **src/modules/lsm/lsm.controller.ts** - Added reject endpoint and status filtering
4. **src/modules/lsm/lsm.service.ts** - Added rejectOnboarding and enhanced getProvidersInRegion
5. **src/modules/provider-onboarding/provider-onboarding.service.ts** - Auto status change on upload
6. **src/modules/providers/providers.service.ts** - Added rejectionReason to profile response

## Migration Required

Run these commands to apply schema changes:
```bash
npx prisma generate
npx prisma migrate dev --name add_rejected_provider_status
npm run build
```

## Testing Examples

### Test as LSM
```bash
# Get all rejected providers
GET /lsm/providers?status=rejected

# Reject a provider
POST /lsm/providers/4/reject-onboarding
{
  "reason": "Please provide updated insurance certificates"
}

# Get all pending (including resubmissions)
GET /lsm/onboarding/pending
```

### Test as Service Provider
```bash
# Check rejection status
GET /provider/profile

# Upload corrected document
POST /provider-onboarding/documents/upload
FormData: file + description

# Check updated status (should be pending now)
GET /provider/profile
```

