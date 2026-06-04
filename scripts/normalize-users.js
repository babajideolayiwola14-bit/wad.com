/**
 * Merge case-insensitive duplicate usernames and remove unused test accounts.
 * Usage: node scripts/normalize-users.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDb, pool, normalizeUserAccounts } = require('../src/db');

(async () => {
  await initDb();
  console.log('User account normalization complete.');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
