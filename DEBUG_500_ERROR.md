# 🔍 Debug 500 Error - Registration Endpoint

## 🚨 Common Causes of 500 Errors

### 1. **Database Connection Issues** (Most Common)

**Check your `.env` file:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/stm_db?schema=public"
```

**Is your database running?**
```bash
# Check if PostgreSQL is running
# Windows: Check Services or Task Manager
# macOS: brew services list | grep postgres
# Linux: sudo systemctl status postgresql
```

**Test database connection:**
```bash
# Try connecting to your database
psql "postgresql://username:password@localhost:5432/stm_db"
```

---

### 2. **Missing Environment Variables**

**Check your `.env` file has:**
```env
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
```

**Generate JWT_SECRET:**
```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 3. **Database Schema Issues**

**Run migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

**Check if tables exist:**
```bash
# Connect to your database and check:
\dt  # List all tables
\d users  # Check users table structure
```

---

### 4. **Import Path Issues**

**Check these files have correct imports:**

**In `src/modules/oauth/oauth.service.ts`:**
```typescript
import { UserRole } from '../user-management/enums/user-role.enum';
```

**In `src/modules/job-management/controllers/job.controller.ts`:**
```typescript
import { UserRole } from '../../user-management/enums/user-role.enum';
```

---

## 🔧 Debug Steps

### Step 1: Check Server Logs

Look at your terminal where you ran `npm run start:dev`. You should see detailed error messages.

**Example of what to look for:**
```
[Nest] ERROR [OAuthService] Registration failed for email customer@test.com: Error: ...
```

### Step 2: Enable Debug Logging

**Add this to your `.env` file:**
```env
LOG_LEVEL=debug
```

### Step 3: Test Database Connection

**Create a simple test endpoint:**

```typescript
// Add this to your app.controller.ts temporarily
@Get('test-db')
async testDb() {
  try {
    const result = await this.prisma.$queryRaw`SELECT 1 as test`;
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Test it:**
```bash
GET http://localhost:3000/test-db
```

---

## 📋 Common Error Messages & Solutions

### Error: "JWT_SECRET is not configured"
**Solution:**
```env
JWT_SECRET="your-secret-key-minimum-32-characters"
```

### Error: "Database connection failed"
**Solution:**
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Check database credentials

### Error: "Table 'users' doesn't exist"
**Solution:**
```bash
npx prisma migrate dev
npx prisma generate
```

### Error: "Cannot find module"
**Solution:**
Check import paths in your files

### Error: "PrismaClient is not defined"
**Solution:**
```bash
npx prisma generate
```

---

## 🧪 Quick Test Script

**Create a file `test-connection.js`:**

```javascript
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    console.log('Testing users table...');
    const userCount = await prisma.users.count();
    console.log(`✅ Users table exists, ${userCount} users found`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

**Run it:**
```bash
node test-connection.js
```

---

## 📝 Step-by-Step Debug Process

### 1. Check Environment Variables
```bash
# In your terminal, check if .env is loaded
echo $DATABASE_URL
echo $JWT_SECRET
```

### 2. Test Database Connection
```bash
# Try connecting directly
psql $DATABASE_URL
```

### 3. Check Prisma Schema
```bash
# Verify schema is valid
npx prisma validate
```

### 4. Check Generated Client
```bash
# Regenerate Prisma client
npx prisma generate
```

### 5. Test Registration with Minimal Data
```json
POST http://localhost:3000/auth/register

{
  "email": "test@test.com",
  "password": "Test123",
  "firstName": "Test",
  "lastName": "User",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```

---

## 🚨 Emergency Fixes

### Fix 1: Reset Everything
```bash
# Stop server
Ctrl+C

# Regenerate Prisma client
npx prisma generate

# Restart server
npm run start:dev
```

### Fix 2: Check Database Tables
```sql
-- Connect to your database and run:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: users, customers, local_service_managers, admin
```

### Fix 3: Manual Database Setup
```bash
# If tables don't exist, create them manually
npx prisma db push
```

---

## 📊 Error Response Format

With the enhanced error handling, you'll now get detailed error responses:

### Database Connection Error
```json
{
  "statusCode": 500,
  "message": "Database connection failed",
  "error": "Unable to connect to the database",
  "details": {
    "suggestion": "Please check if the database is running and accessible",
    "code": "DB_CONNECTION_ERROR"
  }
}
```

### JWT Configuration Error
```json
{
  "statusCode": 500,
  "message": "Server configuration error: JWT_SECRET is not configured",
  "error": "Please contact system administrator"
}
```

### User Already Exists
```json
{
  "statusCode": 409,
  "message": "Registration failed",
  "error": "User with this email already exists",
  "details": {
    "email": "customer@test.com",
    "suggestion": "Please use a different email address or try logging in instead"
  }
}
```

---

## 🔍 What to Look For

### In Server Logs:
1. **Database connection errors**
2. **Missing environment variables**
3. **Import/module errors**
4. **Prisma client errors**
5. **JWT configuration errors**

### In Response:
1. **Detailed error messages**
2. **Error codes**
3. **Suggestions for fixes**
4. **Timestamps**

---

## 💡 Pro Tips

1. **Always check server logs first** - they contain the real error
2. **Test database connection separately** before testing endpoints
3. **Use the test-db endpoint** to verify database connectivity
4. **Check environment variables** are properly loaded
5. **Verify Prisma client** is generated and up to date

---

## 🎯 Quick Checklist

- [ ] Database is running
- [ ] DATABASE_URL is correct in .env
- [ ] JWT_SECRET is set in .env
- [ ] Prisma migrations are run
- [ ] Prisma client is generated
- [ ] Import paths are correct
- [ ] Server is restarted after changes

---

## 📞 Still Having Issues?

**Share these details:**

1. **Full error message** from server logs
2. **Your .env file** (without sensitive data)
3. **Database connection test results**
4. **Server startup logs**

**The enhanced error handling will now give you much more detailed information about what's going wrong!**

---

## ✅ Success Indicators

You'll know it's working when you see:

```json
{
  "user": {
    "id": 1,
    "email": "customer@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Good luck debugging! The enhanced error messages should make it much easier to identify the issue! 🚀**
