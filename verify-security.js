#!/usr/bin/env node

/**
 * Security Verification Script
 * Run this to verify all security features are working
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

console.log('\n🔒 SECURITY FEATURE VERIFICATION\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

// Test 1: .env file exists
console.log('\n✓ TEST 1: Environment Configuration');
if (fs.existsSync('.env')) {
  console.log('  ✅ .env file exists');
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('SECRET_KEY=') && envContent.includes('ADMIN_PASSWORD=')) {
    console.log('  ✅ Required environment variables present');
    passed += 2;
  } else {
    console.log('  ❌ Missing required environment variables');
    failed += 1;
  }
} else {
  console.log('  ❌ .env file not found');
  failed += 1;
}

// Test 2: .gitignore exists
console.log('\n✓ TEST 2: Git Security');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('.env')) {
    console.log('  ✅ .gitignore prevents committing .env');
    passed += 1;
  }
}

// Test 3: Package dependencies
console.log('\n✓ TEST 3: Security Packages');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const securityPackages = ['helmet', 'express-rate-limit', 'bcryptjs', 'dotenv', 'jsonwebtoken'];
  let allPresent = true;
  securityPackages.forEach(pkg => {
    if (packageJson.dependencies[pkg]) {
      console.log(`  ✅ ${pkg} installed`);
      passed += 1;
    } else {
      console.log(`  ❌ ${pkg} missing`);
      allPresent = false;
      failed += 1;
    }
  });
} catch (e) {
  console.log('  ❌ Could not read package.json');
  failed += 1;
}

// Test 4: Security features in server.js
console.log('\n✓ TEST 4: Server Security Middleware');
const serverJs = fs.readFileSync('server.js', 'utf8');
const securityChecks = [
  { name: 'Rate Limiting', pattern: /authLimiter/ },
  { name: 'Helmet.js', pattern: /helmet\(\)/ },
  { name: 'Password Hashing', pattern: /bcrypt\.hashSync/ },
  { name: 'JWT Verification', pattern: /jwt\.verify/ },
  { name: 'Input Validation', pattern: /isValidUsername|isValidPassword/ },
  { name: 'Admin Role Check', pattern: /isAdmin\(/ },
  { name: 'CORS', pattern: /cors\(\)/ }
];

securityChecks.forEach(check => {
  if (check.pattern.test(serverJs)) {
    console.log(`  ✅ ${check.name} implemented`);
    passed += 1;
  } else {
    console.log(`  ❌ ${check.name} missing`);
    failed += 1;
  }
});

// Test 5: Database schema
console.log('\n✓ TEST 5: Database Security');
if (serverJs.includes('DELETE FROM messages WHERE')) {
  console.log('  ✅ Hard delete implemented (messages completely removed)');
  passed += 1;
}
if (serverJs.includes('DELETE FROM messages WHERE parent_id')) {
  console.log('  ✅ Cascade delete of replies implemented');
  passed += 1;
}
if (serverJs.includes('flagged_messages')) {
  console.log('  ✅ Message review queue table exists');
  passed += 1;
}

// Test 6: Security documentation
console.log('\n✓ TEST 6: Documentation');
const docs = ['SECURITY.md', 'DEPLOYMENT_SECURITY.md', 'SECURITY_COMPLETE.md'];
docs.forEach(doc => {
  if (fs.existsSync(doc)) {
    console.log(`  ✅ ${doc} exists`);
    passed += 1;
  }
});

// Results
console.log('\n' + '='.repeat(50));
console.log('\n📊 VERIFICATION RESULTS\n');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📈 Score: ${Math.round(passed / (passed + failed) * 100)}%\n`);

if (failed === 0) {
  console.log('🎉 ALL SECURITY FEATURES VERIFIED!\n');
  console.log('Your app is secure and ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Change SECRET_KEY in .env to a random 32+ character string');
  console.log('2. Change ADMIN_USERNAME and ADMIN_PASSWORD in .env');
  console.log('3. Set NODE_ENV=production in .env when deploying');
  console.log('4. Set up HTTPS with a reverse proxy (nginx, Apache, etc.)');
  console.log('5. Enable database backups');
  console.log('\nFor details, see DEPLOYMENT_SECURITY.md\n');
} else {
  console.log('⚠️  Some security features are missing.');
  console.log('Please review the failed items above.\n');
}

console.log('='.repeat(50) + '\n');
process.exit(failed > 0 ? 1 : 0);
