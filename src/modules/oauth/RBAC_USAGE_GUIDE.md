# 🛡️ RBAC (Role-Based Access Control) - Complete Usage Guide

## 📍 RBAC Components Location

Your RBAC system consists of these components:

```
src/modules/oauth/
├── guards/
│   ├── jwt-auth.guard.ts         # Validates JWT tokens
│   ├── local-auth.guard.ts       # Validates email/password (login)
│   └── roles.guard.ts            # ✨ RBAC - Checks user roles
├── decorators/
│   ├── roles.decorator.ts        # @Roles() - Define required roles
│   ├── current-user.decorator.ts # @CurrentUser() - Get authenticated user
│   └── index.ts                  # Exports all decorators
└── enums/
    └── user-role.enum.ts         # UserRole enum (in user-management module)
```

---

## 🎯 The 4 Roles in Your System

| Role | Enum Value | Database Value | Permissions |
|------|-----------|----------------|-------------|
| **Customer** | `UserRole.CUSTOMER` | `'customer'` | Create jobs, view services, rate providers |
| **Provider** | `UserRole.PROVIDER` | `'service_provider'` | Create services, manage jobs, view earnings |
| **LSM** | `UserRole.LSM` | `'local_service_manager'` | Approve/reject services, manage providers |
| **Admin** | `UserRole.ADMIN` | `'admin'` | **Bypass ALL restrictions** - Full access |

---

## 🔐 RBAC Components Explained

### 1. **RolesGuard** (`guards/roles.guard.ts`)

**What it does:**
- Checks if the authenticated user has the required role(s)
- **Admin users bypass all role checks** ✨
- Works with the `@Roles()` decorator

**Key Features:**
```typescript
✅ Admin Bypass - Admins can access ANY endpoint
✅ Multi-role Support - Allow multiple roles per endpoint
✅ Enum Mapping - Handles Prisma vs TypeScript enum differences
✅ Secure - Returns false if user is missing
```

---

### 2. **@Roles() Decorator** (`decorators/roles.decorator.ts`)

**What it does:**
- Defines which roles can access an endpoint
- Works with `RolesGuard`

**Usage:**
```typescript
import { Roles } from './decorators';
import { UserRole } from '../user-management/enums/user-role.enum';

@Roles(UserRole.ADMIN)              // Only admins
@Roles(UserRole.CUSTOMER)           // Only customers
@Roles(UserRole.LSM, UserRole.ADMIN) // LSM or Admin
```

---

### 3. **@CurrentUser() Decorator** (`decorators/current-user.decorator.ts`)

**What it does:**
- Extracts the authenticated user from the request
- Must be used with `@UseGuards(JwtAuthGuard)`

**Usage:**
```typescript
import { CurrentUser } from './decorators';

// Get entire user object
async getProfile(@CurrentUser() user) {
  return user;
}

// Get specific property
async getMe(@CurrentUser('id') userId: number) {
  return { userId };
}

async getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

---

## 🚀 How to Use RBAC - Step by Step

### **Step 1: Import Required Components**

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './modules/oauth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/oauth/guards/roles.guard';
import { Roles, CurrentUser } from './modules/oauth/decorators';
import { UserRole } from './modules/user-management/enums/user-role.enum';
```

---

### **Step 2: Apply Guards to Your Controller/Endpoint**

You need **BOTH** guards in this order:
1. `JwtAuthGuard` - Validates JWT and adds user to request
2. `RolesGuard` - Checks if user has required role

```typescript
@Controller('jobs')
export class JobsController {
  
  // Example 1: Protected endpoint (any authenticated user)
  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getAllJobs(@CurrentUser() user) {
    return this.jobsService.findAll();
  }

  // Example 2: Only customers can create jobs
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createJob(@CurrentUser() user, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user.id, dto);
  }

  // Example 3: LSM and Admin can view all jobs
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM, UserRole.ADMIN)
  async getAllJobsAdmin() {
    return this.jobsService.findAllWithDetails();
  }
}
```

---

## 📚 Practical Examples by Module

### **1. Job Management Module**

```typescript
import { Controller, Get, Post, Put, UseGuards, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles, CurrentUser } from '../oauth/decorators';
import { UserRole } from '../user-management/enums/user-role.enum';

@Controller('jobs')
export class JobManagementController {
  constructor(private readonly jobService: JobManagementService) {}

  // ✅ Only customers can create jobs
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createJob(@CurrentUser() user, @Body() createJobDto: CreateJobDto) {
    return this.jobService.createJob(user.id, createJobDto);
  }

  // ✅ Only providers can update job status
  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async updateJobStatus(
    @CurrentUser('id') providerId: number,
    @Param('id') jobId: number,
    @Body() updateDto: UpdateJobStatusDto,
  ) {
    return this.jobService.updateStatus(jobId, providerId, updateDto);
  }

  // ✅ Customers can view their own jobs
  @Get('my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async getMyJobs(@CurrentUser('id') customerId: number) {
    return this.jobService.getCustomerJobs(customerId);
  }

  // ✅ Providers can view their assigned jobs
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async getAssignedJobs(@CurrentUser('id') providerId: number) {
    return this.jobService.getProviderJobs(providerId);
  }

  // ✅ Admin and LSM can view all jobs
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LSM)
  async getAllJobs() {
    return this.jobService.findAll();
  }
}
```

---

### **2. Provider Onboarding Module**

```typescript
@Controller('provider-services')
export class ProviderOnboardingController {
  constructor(private readonly providerService: ProviderOnboardingService) {}

  // ✅ Only providers can create services
  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async createService(
    @CurrentUser('id') providerId: number,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.providerService.createService(providerId, createServiceDto);
  }

  // ✅ Only LSM can approve services
  @Put('services/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM, UserRole.ADMIN)
  async approveService(
    @CurrentUser('id') lsmId: number,
    @Param('id') serviceId: number,
  ) {
    return this.providerService.approveService(serviceId, lsmId);
  }

  // ✅ Only LSM can reject services
  @Put('services/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM, UserRole.ADMIN)
  async rejectService(
    @CurrentUser('id') lsmId: number,
    @Param('id') serviceId: number,
    @Body() reason: RejectReasonDto,
  ) {
    return this.providerService.rejectService(serviceId, lsmId, reason);
  }

  // ✅ Customers can view approved services
  @Get('services/approved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async getApprovedServices() {
    return this.providerService.getApprovedServices();
  }
}
```

---

### **3. Admin Dashboard Module**

```typescript
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly adminService: AdminDashboardService) {}

  // ✅ Only admins can access dashboard
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ✅ Only admins can manage users
  @Put('users/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async banUser(@Param('id') userId: number) {
    return this.adminService.banUser(userId);
  }

  // ✅ Admin and LSM can view analytics
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LSM)
  async getAnalytics(@CurrentUser() user) {
    // Admin sees all, LSM sees their region
    if (user.role === 'admin') {
      return this.adminService.getAllAnalytics();
    }
    return this.adminService.getRegionalAnalytics(user.region);
  }
}
```

---

### **4. Payment Module**

```typescript
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ✅ Only customers can make payments
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createPayment(
    @CurrentUser('id') customerId: number,
    @Body() paymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(customerId, paymentDto);
  }

  // ✅ Providers can view their earnings
  @Get('earnings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async getEarnings(@CurrentUser('id') providerId: number) {
    return this.paymentService.getProviderEarnings(providerId);
  }

  // ✅ Only LSM can process refunds
  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM, UserRole.ADMIN)
  async processRefund(
    @CurrentUser('id') lsmId: number,
    @Body() refundDto: RefundDto,
  ) {
    return this.paymentService.processRefund(refundDto, lsmId);
  }
}
```

---

## 🧪 How to Test RBAC

### **Test 1: Customer tries to access customer-only endpoint** ✅

```bash
# 1. Register as customer
POST http://localhost:3000/auth/register
{
  "email": "customer@test.com",
  "password": "Pass123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}

# 2. Copy the accessToken from response

# 3. Access customer endpoint
POST http://localhost:3000/jobs
Authorization: Bearer {accessToken}
{
  "description": "Fix my sink",
  "location": "123 Main St"
}

# ✅ Expected: 200 OK - Job created
```

---

### **Test 2: Customer tries to access provider-only endpoint** ❌

```bash
# Using customer token from Test 1
PUT http://localhost:3000/jobs/1/status
Authorization: Bearer {customerAccessToken}
{
  "status": "completed"
}

# ❌ Expected: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "Forbidden resource",
#   "error": "Forbidden"
# }
```

---

### **Test 3: Admin can access ANY endpoint** ✅

```bash
# 1. Register as admin
POST http://localhost:3000/auth/register
{
  "email": "admin@test.com",
  "password": "Admin123",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567891",
  "role": "ADMIN"
}

# 2. Copy admin accessToken

# 3. Access customer endpoint (even though not a customer)
POST http://localhost:3000/jobs
Authorization: Bearer {adminAccessToken}

# ✅ Expected: 200 OK - Admin bypasses role check

# 4. Access provider endpoint (even though not a provider)
PUT http://localhost:3000/provider-services/1/approve
Authorization: Bearer {adminAccessToken}

# ✅ Expected: 200 OK - Admin bypasses role check
```

---

### **Test 4: LSM approves provider service** ✅

```bash
# 1. Register as LSM
POST http://localhost:3000/auth/register
{
  "email": "lsm@test.com",
  "password": "LSM123",
  "firstName": "LSM",
  "lastName": "Manager",
  "phoneNumber": "+1234567892",
  "role": "LSM"
}

# 2. Approve a service
PUT http://localhost:3000/provider-services/services/1/approve
Authorization: Bearer {lsmAccessToken}

# ✅ Expected: 200 OK - Service approved
```

---

### **Test 5: No token provided** ❌

```bash
# Try to access protected endpoint without token
GET http://localhost:3000/jobs/my-jobs

# ❌ Expected: 401 Unauthorized
# {
#   "statusCode": 401,
#   "message": "Unauthorized"
# }
```

---

## 📋 RBAC Testing Checklist

- [ ] Customer can create jobs
- [ ] Customer CANNOT update job status (provider only)
- [ ] Customer CANNOT approve services (LSM only)
- [ ] Provider can create services
- [ ] Provider can update job status
- [ ] Provider CANNOT approve their own services
- [ ] LSM can approve/reject services
- [ ] LSM can manage providers in their region
- [ ] LSM CANNOT create jobs (customer only)
- [ ] Admin can access ALL endpoints
- [ ] Admin bypasses all role restrictions
- [ ] Unauthenticated users get 401
- [ ] Wrong role users get 403

---

## 🎨 Best Practices

### ✅ DO's

1. **Always use both guards:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   ```

2. **Apply guards in correct order:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)  // ✅ Correct
   @UseGuards(RolesGuard, JwtAuthGuard)  // ❌ Wrong - RolesGuard needs user from JwtAuthGuard
   ```

3. **Use @CurrentUser() to access user data:**
   ```typescript
   async getProfile(@CurrentUser() user) { }
   async getById(@CurrentUser('id') userId: number) { }
   ```

4. **Specify multiple roles when needed:**
   ```typescript
   @Roles(UserRole.LSM, UserRole.ADMIN)
   ```

5. **Add descriptive comments:**
   ```typescript
   // ✅ Only LSM can approve provider services
   @Roles(UserRole.LSM, UserRole.ADMIN)
   ```

---

### ❌ DON'Ts

1. **Don't forget JwtAuthGuard:**
   ```typescript
   @UseGuards(RolesGuard)  // ❌ Missing JwtAuthGuard
   @Roles(UserRole.ADMIN)
   ```

2. **Don't use @Roles() without RolesGuard:**
   ```typescript
   @UseGuards(JwtAuthGuard)  // ❌ Missing RolesGuard
   @Roles(UserRole.ADMIN)    // This won't work!
   ```

3. **Don't rely solely on frontend for role checks:**
   ```typescript
   // ❌ Bad: No guards
   @Get('admin/users')
   async getUsers() { }
   
   // ✅ Good: Backend enforces roles
   @Get('admin/users')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(UserRole.ADMIN)
   async getUsers() { }
   ```

---

## 🔄 Role Mapping

Your system uses different enum values in database vs TypeScript:

| TypeScript Enum | Database Value | Note |
|----------------|---------------|------|
| `UserRole.CUSTOMER` | `'customer'` | Auto-mapped |
| `UserRole.PROVIDER` | `'service_provider'` | Auto-mapped |
| `UserRole.LSM` | `'local_service_manager'` | Auto-mapped |
| `UserRole.ADMIN` | `'admin'` | Auto-mapped |

**The RolesGuard handles this mapping automatically!** ✨

---

## 🛠️ Quick Reference

### Import Statement
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles, CurrentUser } from '../oauth/decorators';
import { UserRole } from '../user-management/enums/user-role.enum';
```

### Basic Usage Template
```typescript
@Controller('your-controller')
export class YourController {
  
  // Protected endpoint - any authenticated user
  @Get('public')
  @UseGuards(JwtAuthGuard)
  async publicEndpoint(@CurrentUser() user) {
    return { message: 'Any authenticated user can access' };
  }

  // Role-restricted endpoint
  @Post('restricted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SPECIFIC_ROLE)
  async restrictedEndpoint(@CurrentUser() user) {
    return { message: 'Only SPECIFIC_ROLE can access' };
  }

  // Admin-only endpoint
  @Delete('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOnlyEndpoint(@CurrentUser('id') adminId: number) {
    return { message: 'Only admins' };
  }
}
```

---

## 🎯 Summary

**RBAC is already implemented and ready to use!** ✨

**What you have:**
- ✅ RolesGuard with admin bypass
- ✅ @Roles() decorator
- ✅ @CurrentUser() decorator
- ✅ 4 roles: Customer, Provider, LSM, Admin
- ✅ Automatic enum mapping
- ✅ Production-ready security

**How to use:**
1. Import guards and decorators
2. Apply `@UseGuards(JwtAuthGuard, RolesGuard)`
3. Add `@Roles(UserRole.XXX)` decorator
4. Use `@CurrentUser()` to get user data

**Remember:**
- Admin bypasses ALL role restrictions
- Always use both guards (Jwt + Roles)
- Test each role's permissions
- Frontend checks are NOT secure - backend must enforce

---

**Need more examples?** Check the controller examples above or ask! 🚀

