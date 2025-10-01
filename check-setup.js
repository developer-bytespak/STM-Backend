#!/usr/bin/env node

/**
 * Environment and Setup Checker
 * Run with: node check-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking your setup...\n');

// Check 1: .env file exists
console.log('1. Checking .env file...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env file exists');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  
  // Check for required variables
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length === 0) {
    console.log('   ✅ All required environment variables found');
  } else {
    console.log('   ❌ Missing environment variables:', missingVars.join(', '));
    console.log('   💡 Add these to your .env file:');
    missingVars.forEach(varName => {
      if (varName === 'JWT_SECRET') {
        console.log(`      ${varName}="STM-super-secret-jwt-key-change-this-in-production-minimum-32-characters"`);
      } else if (varName === 'DATABASE_URL') {
        console.log(`      ${varName}="postgresql://username:password@localhost:5432/stm_db?schema=public"`);
      }
    });
  }
} else {
  console.log('   ❌ .env file not found');
  console.log('   💡 Create a .env file in your project root with:');
  console.log('      JWT_SECRET="your-secret-key-here"');
  console.log('      DATABASE_URL="postgresql://username:password@localhost:5432/stm_db"');
}

console.log('');

// Check 2: Package.json exists
console.log('2. Checking package.json...');
if (fs.existsSync('package.json')) {
  console.log('   ✅ package.json exists');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['@prisma/client', '@nestjs/jwt', 'bcryptjs'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length === 0) {
    console.log('   ✅ All required dependencies found');
  } else {
    console.log('   ❌ Missing dependencies:', missingDeps.join(', '));
    console.log('   💡 Install with: npm install', missingDeps.join(' '));
  }
} else {
  console.log('   ❌ package.json not found');
}

console.log('');

// Check 3: Prisma schema exists
console.log('3. Checking Prisma schema...');
if (fs.existsSync('prisma/schema.prisma')) {
  console.log('   ✅ Prisma schema exists');
  
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  if (schemaContent.includes('model users')) {
    console.log('   ✅ Users model found in schema');
  } else {
    console.log('   ❌ Users model not found in schema');
  }
  
  if (schemaContent.includes('password')) {
    console.log('   ✅ Password field found in users model');
  } else {
    console.log('   ❌ Password field missing in users model');
    console.log('   💡 Add this to your users model:');
    console.log('      password String @db.VarChar(255)');
  }
  
  if (schemaContent.includes('refresh_token')) {
    console.log('   ✅ Refresh token field found');
  } else {
    console.log('   ❌ Refresh token field missing');
    console.log('   💡 Add this to your users model:');
    console.log('      refresh_token String? @db.Text');
  }
} else {
  console.log('   ❌ Prisma schema not found at prisma/schema.prisma');
}

console.log('');

// Check 4: Source files exist
console.log('4. Checking source files...');
const requiredFiles = [
  'src/modules/oauth/oauth.service.ts',
  'src/modules/oauth/oauth.controller.ts',
  'src/modules/oauth/guards/roles.guard.ts',
  'src/modules/user-management/enums/user-role.enum.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} not found`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('   ✅ All required source files exist');
} else {
  console.log('   ❌ Some source files are missing');
}

console.log('');

// Check 5: Node modules
console.log('5. Checking node_modules...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules exists');
  
  const requiredModules = ['@prisma/client', '@nestjs/jwt', 'bcryptjs'];
  const missingModules = [];
  
  requiredModules.forEach(module => {
    if (!fs.existsSync(`node_modules/${module}`)) {
      missingModules.push(module);
    }
  });
  
  if (missingModules.length === 0) {
    console.log('   ✅ All required modules installed');
  } else {
    console.log('   ❌ Missing modules:', missingModules.join(', '));
    console.log('   💡 Run: npm install');
  }
} else {
  console.log('   ❌ node_modules not found');
  console.log('   💡 Run: npm install');
}

console.log('');

// Summary
console.log('📋 Summary:');
console.log('   If you see any ❌ errors above, fix them first');
console.log('   Then run these commands:');
console.log('   1. npm install');
console.log('   2. npx prisma migrate dev');
console.log('   3. npx prisma generate');
console.log('   4. npm run start:dev');
console.log('   5. node test-registration.js');
console.log('');
console.log('🚀 Ready to test!');
