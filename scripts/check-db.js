const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatapp.db');

console.log('=== ALL USERS ===');
db.all('SELECT username, state, lga FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error fetching users:', err);
  } else {
    console.table(rows);
  }
  
  console.log('\n=== MESSAGES IN LAGOS/ALIMOSHO ===');
  db.all(`SELECT id, username, state, lga, message, parent_id, created_at 
          FROM messages 
          WHERE state='Lagos' AND lga='Alimosho' 
          ORDER BY created_at DESC 
          LIMIT 20`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching messages:', err);
    } else {
      console.table(rows);
    }
    
    console.log('\n=== ALL MESSAGES (ALL LOCATIONS) ===');
    db.all(`SELECT id, username, state, lga, message, parent_id, created_at 
            FROM messages 
            ORDER BY created_at DESC 
            LIMIT 20`, [], (err, rows) => {
      if (err) {
        console.error('Error fetching all messages:', err);
      } else {
        console.table(rows);
      }
      db.close();
    });
  });
});
