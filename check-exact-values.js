const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatapp.db');

console.log('\n=== EXACT CHARACTER INSPECTION ===\n');

// Check messages with character codes
db.all('SELECT id, username, state, lga, message FROM messages WHERE id IN (18, 19, 21, 22, 24)', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  rows.forEach(row => {
    console.log(`Message ID ${row.id} by ${row.username}:`);
    console.log(`  State: "${row.state}"`);
    console.log(`  State length: ${row.state ? row.state.length : 'NULL'}`);
    console.log(`  State char codes: ${row.state ? Array.from(row.state).map(c => c.charCodeAt(0)).join(',') : 'NULL'}`);
    console.log(`  LGA: "${row.lga}"`);
    console.log(`  LGA length: ${row.lga ? row.lga.length : 'NULL'}`);
    console.log(`  LGA char codes: ${row.lga ? Array.from(row.lga).map(c => c.charCodeAt(0)).join(',') : 'NULL'}`);
    console.log(`  Message: ${row.message.substring(0, 50)}...`);
    console.log('');
  });
  
  // Now test the exact query the server uses
  const testState = 'Ogun';
  const testLga = 'Ijebu East';
  console.log(`\nTesting query with State="${testState}" (len=${testState.length}) and LGA="${testLga}" (len=${testLga.length}):`);
  
  db.all(
    'SELECT id, username, state, lga FROM messages WHERE state = ? AND lga = ? LIMIT 10',
    [testState, testLga],
    (err, results) => {
      if (err) {
        console.error('Query error:', err);
      } else {
        console.log(`Query returned ${results.length} messages`);
        results.forEach(r => {
          console.log(`  ID ${r.id}: "${r.state}" / "${r.lga}"`);
        });
      }
      db.close();
    }
  );
});
