# JWT Authentication with Passport.js - Implementation Guide

## Overview
This OAuth module implements JWT-based authentication using Passport.js strategies for the STM platform.

## Architecture

### 1. JWT Strategy (`jwt.strategy.ts`)
- **Purpose**: Validates JWT tokens from Authorization header
- **Extraction**: Uses `ExtractJwt.fromAuthHeaderAsBearerToken()`
- **Validation**: Validates token signature and expiration
- **User Lookup**: Fetches user profile from database using token payload

### 2. Local Strategy (`local.strategy.ts`)
- **Purpose**: Validates email/password credentials
- **Username Field**: Uses 'email' instead of default 'username'
- **Validation**: Calls OAuthService.validateUser() for credential verification

### 3. Guards
- **JwtAuthGuard**: Protects routes requiring JWT authentication
- **LocalAuthGuard**: Protects login endpoint
- **RolesGuard**: Implements role-based access control

### 4. Decorators
- **@Roles()**: Defines required roles for endpoint access

## Implementation Details

### JWT Token Structure
```typescript
{
  email: string,
  sub: string, // user ID
  role: UserRole,
  iat: number, // issued at
  exp: number  // expiration
}
```

### Authentication Flow
1. **Registration**: User registers → Account created → Email verification sent
2. **Login**: User provides email/password → LocalStrategy validates → JWT token issued
3. **Protected Routes**: JWT token in Authorization header → JwtStrategy validates → User object attached to request
4. **Role-based Access**: RolesGuard checks user role against endpoint requirements

### Environment Variables Required
```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

## Usage Examples

### Protecting Routes
```typescript
@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user; // User object from JWT payload
  }
}
```

### Role-based Access Control
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN)
  async getUsers() {
    // Only admins can access this endpoint
  }
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

## Security Features

### 1. Token Security
- **Secret Key**: Uses environment variable for JWT secret
- **Expiration**: Configurable token expiration (default 24h)
- **Refresh Tokens**: Separate refresh token with longer expiration (7d)

### 2. Password Security
- **Hashing**: Uses bcryptjs for password hashing
- **Salt Rounds**: 12 rounds for strong security
- **Validation**: Minimum 6 characters required

### 3. Role-based Access
- **Granular Control**: Different roles can access different endpoints
- **Flexible**: Single user can have multiple roles
- **Secure**: Role validation on every protected request

## Database Integration

### Required Tables
- **users**: Core user information
- **refresh_tokens**: Refresh token storage
- **otp**: OTP verification codes
- **email_verifications**: Email verification tokens

### User Roles
- **CUSTOMER**: End users requesting services
- **PROVIDER**: Service providers
- **ADMIN**: Platform administrators
- **LSM**: Local Service Managers

## Error Handling

### Common Errors
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient role permissions
- **400 Bad Request**: Invalid credentials or validation errors

### Error Responses
```typescript
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Testing

### Unit Tests
- Test JWT strategy validation
- Test local strategy authentication
- Test role-based access control
- Test token generation and validation

### Integration Tests
- Test complete authentication flow
- Test protected route access
- Test role-based endpoint protection
- Test token refresh mechanism

## Security Best Practices

1. **Environment Variables**: Store JWT secret in environment variables
2. **Token Expiration**: Use short-lived access tokens
3. **Refresh Tokens**: Implement secure refresh token rotation
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting on authentication endpoints
6. **Logging**: Log authentication attempts and failures
7. **Monitoring**: Monitor for suspicious authentication patterns

## Dependencies

### Required Packages
```json
{
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "bcryptjs": "^2.4.3",
  "class-validator": "^0.14.1"
}
```

## Next Steps

1. **Implement OAuthService**: Complete the authentication service logic
2. **Database Schema**: Work with Prisma team on user tables
3. **OTP Integration**: Implement SMS/Email OTP verification
4. **Password Reset**: Implement secure password reset flow
5. **Rate Limiting**: Add rate limiting to authentication endpoints
6. **Monitoring**: Implement authentication monitoring and alerting
7. **Testing**: Write comprehensive tests for all authentication flows
