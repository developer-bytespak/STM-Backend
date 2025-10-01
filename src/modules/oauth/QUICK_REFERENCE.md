# OAuth Service - Quick Reference Guide

## 🔑 Available Methods

### Public Methods (Available to Controllers)

#### 1. `register(registerDto: RegisterDto)`
Register a new user with role-specific profile creation.

```typescript
const result = await this.oauthService.register({
  email: 'user@example.com',
  password: 'SecurePass123',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  role: UserRole.CUSTOMER
});

// Returns:
// {
//   user: { id, email, firstName, lastName, role },
//   accessToken: "...",
//   refreshToken: "..."
// }
```

**Supported Roles:**
- ✅ `CUSTOMER` - Creates customer profile
- ✅ `LSM` - Creates LSM profile (requires region later)
- ✅ `ADMIN` - Creates admin profile
- ❌ `PROVIDER` - Throws error (use provider onboarding)

---

#### 2. `validateUser(email: string, password: string)`
Validate user credentials (used by LocalStrategy).

```typescript
const user = await this.oauthService.validateUser(
  'user@example.com',
  'SecurePass123'
);

// Returns user object (without password) or null
```

---

#### 3. `login(user: any)`
Generate tokens for authenticated user.

```typescript
const result = await this.oauthService.login(req.user);

// Returns:
// {
//   user: { id, email, firstName, lastName, role },
//   accessToken: "...",
//   refreshToken: "..."
// }
```

---

#### 4. `refreshTokens(refreshToken: string)`
Refresh access token using refresh token.

```typescript
const tokens = await this.oauthService.refreshTokens(refreshToken);

// Returns:
// {
//   accessToken: "...",
//   refreshToken: "..."
// }
```

**Throws:** `UnauthorizedException` if token is invalid or expired

---

#### 5. `getProfile(userId: number)`
Get user profile with role-specific data.

```typescript
const profile = await this.oauthService.getProfile(userId);

// Returns user data with roleData object containing:
// - Customer: retention_metrics, job count, ratings count
// - Provider: LSM info, performance metrics, job/service counts
// - LSM: provider count, log count
// - Admin: admin configuration
```

---

#### 6. `logout(userId: number)`
Logout user by invalidating refresh token.

```typescript
await this.oauthService.logout(userId);
// Removes refresh token from database
```

---

## 📊 Return Types

### Registration/Login Response
```typescript
{
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
```

### Refresh Response
```typescript
{
  accessToken: string;
  refreshToken: string;
}
```

### Profile Response
```typescript
{
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  is_email_verified: boolean;
  roleData: {
    // Role-specific data (customer, provider, LSM, or admin)
  }
}
```

---

## 🚨 Error Handling

### ConflictException (409)
- Email already exists during registration

### UnauthorizedException (401)
- Invalid credentials
- Invalid or expired refresh token
- User not found during token validation

### BadRequestException (400)
- Provider trying to register via general endpoint
- Missing required fields

### NotFoundException (404)
- User not found when fetching profile

---

## 🔐 Security Features

### Password Security
- ✅ Hashed with bcryptjs (12 salt rounds)
- ✅ Never returned in responses
- ✅ Secure comparison (timing-safe)

### Token Security
- ✅ Refresh tokens hashed before storage
- ✅ Token rotation on refresh
- ✅ Configurable expiration
- ✅ Role included in payload

### Database Security
- ✅ Transactions for atomic operations
- ✅ Selective field queries (no password exposure)

---

## 💡 Usage Examples in Controllers

### Registration Endpoint
```typescript
@Post('register')
async register(@Body() registerDto: RegisterDto) {
  return this.oauthService.register(registerDto);
}
```

### Login Endpoint
```typescript
@Post('login')
@UseGuards(LocalAuthGuard)
async login(@Request() req) {
  return this.oauthService.login(req.user);
}
```

### Get Profile Endpoint
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  return this.oauthService.getProfile(req.user.id);
}
```

### Refresh Token Endpoint
```typescript
@Post('refresh')
async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
  return this.oauthService.refreshTokens(refreshTokenDto.refreshToken);
}
```

### Logout Endpoint
```typescript
@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Request() req) {
  await this.oauthService.logout(req.user.id);
  return { message: 'Logged out successfully' };
}
```

---

## 🎯 Role-Based Profile Creation

### Customer Registration
```typescript
register({
  role: UserRole.CUSTOMER,
  // ... other fields
})
// Creates: users + customers table entries
```

### LSM Registration
```typescript
register({
  role: UserRole.LSM,
  // ... other fields
})
// Creates: users + local_service_managers table entries
// Note: Region should be updated later
```

### Admin Registration
```typescript
register({
  role: UserRole.ADMIN,
  // ... other fields
})
// Creates: users + admin table entries
```

### Provider Registration
```typescript
// DON'T use general register()
// Use provider onboarding endpoint instead
// Requires LSM assignment
```

---

## 📝 JWT Token Payload Structure

```typescript
{
  email: string;      // User's email
  sub: number;        // User ID
  role: string;       // User role (customer, service_provider, local_service_manager, admin)
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)
}
```

---

## ⚙️ Configuration

Required environment variables:

```env
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"              # Access token expiration
JWT_REFRESH_EXPIRES_IN="7d"       # Refresh token expiration
```

---

## 🧪 Testing Checklist

- [ ] Register customer successfully
- [ ] Register LSM successfully
- [ ] Register admin successfully
- [ ] Provider registration throws error
- [ ] Duplicate email throws conflict error
- [ ] Login with valid credentials
- [ ] Login with invalid credentials fails
- [ ] Get profile with valid token
- [ ] Refresh token successfully
- [ ] Refresh with invalid token fails
- [ ] Logout invalidates refresh token
- [ ] Profile includes role-specific data

---

## 🔄 Token Lifecycle

```
Registration/Login
  ↓
Generate access + refresh tokens
  ↓
Store hashed refresh token in DB
  ↓
User makes authenticated requests (access token)
  ↓
Access token expires (after 24h)
  ↓
Use refresh token to get new tokens
  ↓
Old refresh token invalidated
  ↓
New tokens generated
  ↓
Repeat...
```

---

## 🎨 Best Practices

1. **Always hash passwords** - Never store plain text
2. **Use transactions** - For multi-table operations
3. **Validate input** - Use DTOs with class-validator
4. **Handle errors gracefully** - Return proper HTTP status codes
5. **Sanitize responses** - Never return passwords
6. **Rotate refresh tokens** - On every refresh for security
7. **Set appropriate expiration** - Balance security vs UX
8. **Log authentication events** - For security monitoring

---

**Need help?** Check `PHASE_2_SETUP.md` for detailed documentation.

