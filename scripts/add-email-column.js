const sqlite3 = require('sqlite3');
const db=new sqlite3.Database('chatapp.db');
db.run("ALTER TABLE users ADD COLUMN email TEXT UNIQUE", [], function(err){
  if(err) console.error('alter error', err.message);
  else console.log('column added or already exists');
  db.all("PRAGMA table_info(users)",[],(e,rows)=>{console.log('schema',rows);db.close();});
});
