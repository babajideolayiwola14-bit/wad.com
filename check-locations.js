const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatapp.db');

console.log('\n=== CHECKING LOCATION DATA ===\n');

// Check all unique state/lga combinations in messages
db.all('SELECT DISTINCT state, lga, COUNT(*) as count FROM messages GROUP BY state, lga ORDER BY state, lga', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Unique State/LGA combinations in messages:');
  rows.forEach(row => {
    console.log(`  "${row.state}" / "${row.lga}" - ${row.count} messages`);
  });
  console.log('');
  
  // Check specific messages from Bambo
  db.all('SELECT id, username, state, lga, message, created_at FROM messages WHERE username = "Bambo" ORDER BY created_at DESC', (err, messages) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('Bambo messages:');
    messages.forEach(msg => {
      console.log(`  ID ${msg.id}: state="${msg.state}", lga="${msg.lga}"`);
      console.log(`    Message: ${msg.message.substring(0, 50)}...`);
    });
    console.log('');
    
    // Check user1 messages
    db.all('SELECT id, username, state, lga, message, created_at FROM messages WHERE username = "user1" ORDER BY created_at DESC', (err, messages) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      console.log('user1 messages:');
      messages.forEach(msg => {
        console.log(`  ID ${msg.id}: state="${msg.state}", lga="${msg.lga}"`);
        console.log(`    Message: ${msg.message.substring(0, 50)}...`);
      });
      
      db.close();
    });
  });
});
