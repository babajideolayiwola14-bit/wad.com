const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node decode-token.js <your-jwt-token>');
  console.log('\nTo get your token:');
  console.log('1. Open browser console (F12)');
  console.log('2. Type: localStorage.getItem("token")');
  console.log('3. Copy the token and paste here');
  process.exit(1);
}

try {
  const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this-in-production';
  const decoded = jwt.verify(token, SECRET_KEY);
  console.log('\n=== DECODED TOKEN ===\n');
  console.log('Username:', decoded.username);
  console.log('State:', `"${decoded.state}"`);
  console.log('LGA:', `"${decoded.lga}"`);
  console.log('Role:', decoded.role);
  console.log('\nToken is valid and will be accepted by server.');
} catch (err) {
  console.error('Error decoding token:', err.message);
  console.log('\nToken may be expired or invalid.');
}
