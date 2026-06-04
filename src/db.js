const { Pool } = require('pg');
const { ROOT } = require('./paths');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required (PostgreSQL — e.g. Render database URL).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

async function dbRun(sql, params = []) {
  let pgSql = sql;
  let count = 0;
  pgSql = pgSql.replace(/\?/g, () => `$${++count}`);

  const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
  if (isInsert && !/RETURNING/i.test(pgSql)) {
    if (/INSERT\s+INTO\s+users/i.test(pgSql)) {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING username');
    } else {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }
  }

  const client = await pool.connect();
  try {
    const result = await client.query(pgSql, params);
    return {
      lastID: result.rows[0]?.id ?? result.rows[0]?.username,
      changes: result.rowCount,
      rows: result.rows,
    };
  } finally {
    client.release();
  }
}

async function dbAll(sql, params = []) {
  let pgSql = sql;
  let count = 0;
  pgSql = pgSql.replace(/\?/g, () => `$${++count}`);

  const client = await pool.connect();
  try {
    const result = await client.query(pgSql, params);
    return result.rows || [];
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      state TEXT,
      lga TEXT,
      message TEXT NOT NULL,
      parent_id INTEGER,
      attachment_url TEXT,
      attachment_type TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      email TEXT UNIQUE,
      state TEXT,
      lga TEXT,
      role TEXT DEFAULT 'user',
      banned INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS interactions (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS flagged_messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      rejection_reason TEXT,
      state TEXT,
      lga TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrations = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS banned INTEGER;',
    "UPDATE users SET role = 'user' WHERE role IS NULL;",
    'UPDATE users SET banned = 0 WHERE banned IS NULL;',
  ];

  for (const sql of migrations) {
    try {
      await dbRun(sql);
    } catch (e) {
      console.log('Migration skipped:', e.message);
    }
  }

  console.log('PostgreSQL schema ready');
}

async function initDb() {
  console.log('Connecting to PostgreSQL…');
  await pool.query('SELECT 1');
  await ensureSchema();
}

module.exports = { pool, dbRun, dbAll, ensureSchema, initDb, ROOT };
