/**
 * Reset a user's password in PostgreSQL.
 * Usage: node scripts/reset-user-password.js <username> <newPassword>
 * Requires DATABASE_URL in environment (or .env).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (!username || !newPassword) {
  console.error('Usage: node scripts/reset-user-password.js <username> <newPassword>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

(async () => {
  const hash = bcrypt.hashSync(newPassword, 10);
  const result = await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE LOWER(username) = LOWER($2) RETURNING username',
    [hash, username]
  );
  if (!result.rowCount) {
    console.error('User not found:', username);
    process.exit(1);
  }
  console.log('Password updated for:', result.rows[0].username);
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
