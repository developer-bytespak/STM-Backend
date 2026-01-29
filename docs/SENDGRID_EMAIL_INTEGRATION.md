# SendGrid Email Integration for Job Notifications

## Overview

This document describes the SendGrid email integration that sends email notifications to service providers and customers for key job-related events. This is an add-on to the existing in-app notification system, providing email notifications that can be accessed on mobile devices.

## Features Implemented

### 1. Email to Service Provider When Job Request is Created
- **Trigger**: When a customer creates a new job request
- **Location**: `jobs.service.ts` → `createJob()` method
- **Recipient**: Service provider's email address
- **Content**: Job details including service name, customer name, location, price, and scheduled date

### 2. Email to Service Provider When Deal is Closed
- **Trigger**: When a customer closes the deal (job status changes to 'in_progress')
- **Location**: `customers.service.ts` → `performJobAction()` method (CLOSE_DEAL action)
- **Recipient**: Service provider's email address
- **Content**: Confirmation that deal is closed and work can begin, including job details

### 3. Email to Customer When Provider Accepts Job
- **Trigger**: When a service provider accepts a job request
- **Location**: `jobs.service.ts` → `respondToJob()` method (ACCEPT action)
- **Recipient**: Customer's email address
- **Content**: Confirmation that provider accepted the request, with option to close the deal

### 4. Email to Customer When Provider Negotiates
- **Trigger**: When a service provider proposes changes (negotiates) to a job request
- **Location**: `jobs.service.ts` → `respondToJob()` method (NEGOTIATE action)
- **Recipient**: Customer's email address
- **Content**: Details of proposed changes including price, schedule, and provider notes

## Implementation Details

### Email Service (`email.service.ts`)

Located at: `src/modules/shared/services/email.service.ts`

The service provides four main methods:
- `sendJobRequestEmailToProvider()` - New job request notification
- `sendDealClosedEmailToProvider()` - Deal closed notification
- `sendJobAcceptedEmailToCustomer()` - Job accepted notification
- `sendJobNegotiationEmailToCustomer()` - Negotiation notification

Each method:
- Uses SendGrid API via `@sendgrid/mail` package
- Sends HTML-formatted emails with professional styling
- Includes fallback text versions for email clients that don't support HTML
- Logs success/failure but doesn't throw errors (non-blocking)
- Uses environment variables for configuration

### Email Templates

All emails include:
- Professional HTML styling with gradients and modern design
- Clear call-to-action buttons linking to relevant pages
- Job details in an easy-to-read format
- Mobile-responsive design
- Plain text fallback versions

### Integration Points

1. **Jobs Module** (`jobs.module.ts`)
   - Added `EmailService` as a provider
   - Injected into `JobsService`

2. **Customers Module** (`customers.module.ts`)
   - Added `EmailService` as a provider
   - Injected into `CustomersService`

3. **Jobs Service** (`jobs.service.ts`)
   - Updated `createJob()` to send email after creating notification
   - Updated `respondToJob()` to send emails for ACCEPT and NEGOTIATE actions
   - Includes user email addresses in Prisma queries

4. **Customers Service** (`customers.service.ts`)
   - Updated `performJobAction()` to send email when deal is closed
   - Includes provider user email in Prisma queries

## Environment Variables Required

Add these to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@yourdomain.com
# OR
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend-domain.com

# Email Testing (Development Mode Only)
# These emails will be used instead of database emails when NODE_ENV=development
TEST_CUSTOMER_EMAIL=test.customer@yourdomain.com
TEST_PROVIDER_EMAIL=test.provider@yourdomain.com
```

### Environment Variable Details

- **SENDGRID_API_KEY** (Required)
  - Your SendGrid API key
  - Get it from: https://app.sendgrid.com/settings/api_keys
  - The service will log a warning if this is missing but won't crash

- **EMAIL_FROM** or **SENDGRID_FROM_EMAIL** (Optional)
  - The "from" email address for all emails
  - Default: `noreply@stmapp.com`
  - Must be verified in your SendGrid account

- **FRONTEND_URL** (Optional)
  - Base URL of your frontend application
  - Used in email links to direct users to relevant pages
  - Default: `http://localhost:3000`
  - Should be set to your production frontend URL in production

- **TEST_CUSTOMER_EMAIL** (Optional, Development Only)
  - Test email address for customer notifications
  - Only used when `NODE_ENV=development`
  - All customer emails will be sent to this address instead of the actual customer email
  - Useful for testing without sending emails to real users
  - Example: `test.customer@yourdomain.com`

- **TEST_PROVIDER_EMAIL** (Optional, Development Only)
  - Test email address for provider notifications
  - Only used when `NODE_ENV=development`
  - All provider emails will be sent to this address instead of the actual provider email
  - Useful for testing without sending emails to real users
  - Example: `test.provider@yourdomain.com`

### Development Mode Behavior

When `NODE_ENV=development`:
- If `TEST_CUSTOMER_EMAIL` is set, all customer emails will be redirected to this address
- If `TEST_PROVIDER_EMAIL` is set, all provider emails will be redirected to this address
- The service logs which email is being used (test vs actual)
- This allows you to test email functionality without sending emails to real users

**Note**: In production (`NODE_ENV=production`), the actual email addresses from the database will always be used, regardless of test email settings.

## Error Handling

- Email sending is **non-blocking** - failures won't prevent job operations from completing
- Errors are logged to the console for debugging
- The service gracefully handles missing API keys (logs warning, doesn't crash)
- Email failures are caught and logged but don't affect the main workflow

## Testing

To test the email integration:

1. **Set up SendGrid**:
   - Create a SendGrid account at https://sendgrid.com
   - Generate an API key
   - Verify your sender email address
   - Add the API key to your `.env` file

2. **Test Job Creation**:
   - Create a job as a customer
   - Check the service provider's email inbox

3. **Test Provider Acceptance**:
   - Have a provider accept a job
   - Check the customer's email inbox

4. **Test Negotiation**:
   - Have a provider negotiate a job
   - Check the customer's email inbox

5. **Test Deal Closure**:
   - Have a customer close a deal
   - Check the service provider's email inbox

## Email Template Customization

Email templates are defined in `email.service.ts` in the private methods:
- `getJobRequestEmailTemplate()`
- `getDealClosedEmailTemplate()`
- `getJobAcceptedEmailTemplate()`
- `getJobNegotiationEmailTemplate()`

You can customize:
- Colors and styling
- Content and messaging
- Button text and links
- Layout and structure

## Dependencies

The following packages are already installed (no additional installation needed):
- `@sendgrid/mail` (^8.1.6) - SendGrid Node.js library
- `@nestjs/config` - For environment variable management

## Notes

- Emails are sent asynchronously and won't block the main application flow
- The service checks for email addresses before sending (won't send if email is missing)
- All emails include both HTML and plain text versions for maximum compatibility
- Email links point to the frontend application for a seamless user experience
- The implementation follows the existing notification pattern (in-app + email)

## Future Enhancements

Potential improvements:
- Email preferences/settings for users
- Email templates stored in database for easy updates
- Email queue system for better reliability
- Email analytics and tracking
- Support for multiple languages
- Email digests (daily/weekly summaries)
