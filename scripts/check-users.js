const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT username FROM users ORDER BY username')
  .then(res => {
    console.log('Users in database:');
    res.rows.forEach(row => console.log('-', row.username));
    pool.end();
  })
  .catch(err => {
    console.error('Error:', err);
    pool.end();
  });
