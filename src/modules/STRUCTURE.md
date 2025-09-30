# STM Backend Module Structure

## Complete File Structure

```
src/modules/
├── oauth/                                    # Authentication & Authorization
│   ├── oauth.module.ts                      # Main OAuth module
│   ├── oauth.controller.ts                  # Authentication endpoints
│   ├── oauth.service.ts                     # Authentication business logic
│   ├── strategies/
│   │   ├── jwt.strategy.ts                  # JWT authentication strategy
│   │   ├── local.strategy.ts                # Local authentication strategy
│   │   └── otp.strategy.ts                  # OTP authentication strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                # JWT authentication guard
│   │   ├── local-auth.guard.ts              # Local authentication guard
│   │   └── roles.guard.ts                   # Role-based access control guard
│   ├── decorators/
│   │   └── roles.decorator.ts               # Roles decorator
│   └── dto/
│       ├── login.dto.ts                     # Login request DTO
│       ├── register.dto.ts                  # Registration DTO
│       ├── verify-otp.dto.ts                # OTP verification DTO
│       ├── resend-otp.dto.ts                # Resend OTP DTO
│       ├── reset-password.dto.ts            # Password reset DTO
│       ├── change-password.dto.ts           # Change password DTO
│       ├── refresh-token.dto.ts             # Refresh token DTO
│       └── index.ts                         # DTO exports
│
├── user-management/                          # User Management System
│   ├── user-management.module.ts            # Main user management module
│   ├── user-management.controller.ts        # User management endpoints
│   ├── user-management.service.ts           # Core user management logic
│   ├── enums/
│   │   ├── user-role.enum.ts                # User role definitions
│   │   └── provider-tier.enum.ts            # Provider tier classifications
│   ├── controllers/
│   │   ├── customer.controller.ts           # Customer-specific endpoints
│   │   ├── provider.controller.ts           # Provider-specific endpoints
│   │   ├── admin.controller.ts              # Admin-specific endpoints
│   │   └── lsm.controller.ts                # LSM-specific endpoints
│   └── services/
│       ├── customer.service.ts              # Customer business logic
│       ├── provider.service.ts              # Provider business logic
│       ├── admin.service.ts                 # Admin business logic
│       ├── lsm.service.ts                   # LSM business logic
│       └── dashboard.service.ts             # Dashboard data aggregation
│
├── provider-onboarding/                      # Provider Onboarding & Verification
│   ├── provider-onboarding.module.ts        # Main onboarding module
│   ├── provider-onboarding.controller.ts    # Onboarding endpoints
│   ├── provider-onboarding.service.ts       # Onboarding business logic
│   └── services/
│       ├── document-verification.service.ts # Document validation service
│       ├── tier-classification.service.ts   # Tier assignment service
│       └── approval-workflow.service.ts     # Approval process service
│
├── job-management/                           # Job Management System
│   ├── job-management.module.ts             # Main job management module
│   ├── job-management.controller.ts         # Job management endpoints
│   ├── job-management.service.ts            # Job management business logic
│   ├── enums/
│   │   └── job-status.enum.ts               # Job and booking status definitions
│   ├── controllers/
│   │   ├── job.controller.ts                # Job-specific endpoints
│   │   ├── booking.controller.ts            # Booking-specific endpoints
│   │   └── job-tracker.controller.ts        # Real-time tracking endpoints
│   └── services/
│       ├── job.service.ts                   # Job business logic
│       ├── booking.service.ts               # Booking business logic
│       ├── job-tracker.service.ts           # Real-time tracking logic
│       ├── pricing.service.ts               # Dynamic pricing service
│       └── scheduling.service.ts            # Scheduling and availability service
│
├── communication/                            # Communication & Engagement
│   ├── communication.module.ts              # Main communication module
│   ├── communication.controller.ts          # Communication endpoints
│   ├── communication.service.ts             # Communication business logic
│   └── services/
│       ├── messaging.service.ts             # In-app messaging system
│       ├── notification.service.ts          # Multi-channel notifications
│       ├── call-tracking.service.ts         # Call logging and tracking
│       └── engagement-metrics.service.ts    # Engagement tracking
│
├── search-matching/                          # Search & Matching Engine
│   ├── search-matching.module.ts            # Main search module
│   ├── search-matching.controller.ts        # Search endpoints
│   ├── search-matching.service.ts           # Search business logic
│   └── services/
│       ├── ai-matching.service.ts           # AI-based provider matching
│       ├── search.service.ts                # Search functionality
│       └── ranking.service.ts               # Provider ranking algorithms
│
├── payment/                                  # Payment & Financial Management
│   ├── payment.module.ts                    # Main payment module
│   ├── payment.controller.ts                # Payment endpoints
│   ├── payment.service.ts                   # Payment business logic
│   └── services/
│       ├── stripe.service.ts                # Stripe integration
│       ├── paypal.service.ts                # PayPal integration
│       ├── invoicing.service.ts             # Automated invoicing
│       └── earnings.service.ts              # Provider earnings management
│
├── ratings-feedback/                         # Ratings & Feedback System
│   ├── ratings-feedback.module.ts           # Main ratings module
│   ├── ratings-feedback.controller.ts       # Feedback endpoints
│   └── ratings-feedback.service.ts          # Feedback business logic
│
├── analytics/                                # Analytics & Insights
│   ├── analytics.module.ts                  # Main analytics module
│   ├── analytics.controller.ts              # Analytics endpoints
│   └── analytics.service.ts                 # Analytics business logic
│
├── office-real-estate/                       # Shared Office & Real Estate
│   ├── office-real-estate.module.ts         # Main office module
│   ├── office-real-estate.controller.ts     # Office space endpoints
│   └── office-real-estate.service.ts        # Office space business logic
│
├── admin-dashboard/                          # Admin Dashboard & Controls
│   ├── admin-dashboard.module.ts            # Main admin module
│   ├── admin-dashboard.controller.ts        # Admin control endpoints
│   └── admin-dashboard.service.ts           # Admin dashboard logic
│
└── shared/                                   # Shared Services
    └── services/
        ├── email.service.ts                 # Email notification service
        ├── sms.service.ts                   # SMS notification service
        ├── notification.service.ts          # Unified notification service
        ├── file-upload.service.ts           # File upload service
        └── encryption.service.ts            # Encryption service
```

## Module Responsibilities

### 1. OAuth Module
- JWT authentication
- OTP verification (email/SMS)
- Role-based access control
- Password management

### 2. User Management Module
- Customer profile management
- Provider profile management
- Admin account management
- LSM account management
- Dashboard data aggregation

### 3. Provider Onboarding Module
- Provider registration workflow
- Document verification
- Tier classification (Bronze, Silver, Gold, PESP)
- LSM evaluation system

### 4. Job Management Module
- Job lifecycle management
- Booking system
- Real-time job tracking
- Dynamic pricing
- Scheduling and availability

### 5. Communication Module
- In-app messaging system
- Multi-channel notifications
- Call tracking (Twilio/3CX)
- Engagement metrics

### 6. Search & Matching Module
- AI-based provider matching
- Service search functionality
- Provider ranking algorithms
- Availability filtering

### 7. Payment Module
- Stripe/PayPal integration
- Automated invoicing
- Provider earnings tracking
- Commission management

### 8. Ratings & Feedback Module
- Customer feedback collection
- Provider rating system
- Review management
- Performance metrics

### 9. Analytics Module
- Provider performance analytics
- Market analytics
- Customer insights
- Regional reporting

### 10. Office & Real Estate Module
- Office space listings
- Booking system
- Usage analytics
- Revenue tracking

### 11. Admin Dashboard Module
- System oversight
- User management
- Financial controls
- Platform settings

## Implementation Notes

- All modules are separate and independent
- Each module has its own controllers, services, and DTOs
- Shared services are available to all modules
- OAuth module is the first module as requested
- Each file contains TODO comments for implementation guidance
- Database schema will be handled by your friend in the Prisma folder
- All modules are imported in the main app.module.ts

## Next Steps

1. Implement OAuth module first (authentication foundation)
2. Implement User Management module (user types)
3. Implement Provider Onboarding module (provider verification)
4. Implement Job Management module (core business logic)
5. Continue with remaining modules in order of priority
6. Integrate with Prisma database schema
7. Add proper error handling and validation
8. Implement logging and monitoring
9. Add unit and integration tests
10. Deploy and configure environments
