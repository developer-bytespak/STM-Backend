#!/usr/bin/env node

/**
 * Simple test script to debug registration endpoint
 * Run with: node test-registration.js
 */

const http = require('http');

const testData = {
  email: "customer@test.com",
  password: "Test123",
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+1234567890",
  role: "CUSTOMER"
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing registration endpoint...');
console.log('📋 Test data:', testData);
console.log('🌐 URL: http://localhost:3000/auth/register');
console.log('');

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    console.log('');
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('✅ SUCCESS: Registration worked!');
    } else {
      console.log('❌ ERROR: Registration failed');
      console.log('');
      console.log('🔍 Debug steps:');
      console.log('1. Check if server is running: npm run start:dev');
      console.log('2. Check server logs for detailed error messages');
      console.log('3. Verify database connection');
      console.log('4. Check .env file has JWT_SECRET and DATABASE_URL');
      console.log('5. Run: npx prisma migrate dev');
      console.log('6. Run: npx prisma generate');
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Connection Error:', e.message);
  console.log('');
  console.log('🔍 Possible causes:');
  console.log('1. Server is not running - start with: npm run start:dev');
  console.log('2. Wrong port - check if server is on port 3000');
  console.log('3. Server crashed - check terminal for errors');
});

req.write(postData);
req.end();
