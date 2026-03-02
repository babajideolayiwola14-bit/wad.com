const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('chatapp.db');
db.all("PRAGMA table_info(users)", [], (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  db.close();
});
