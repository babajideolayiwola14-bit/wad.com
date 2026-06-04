const sqlite3=require('sqlite3');
const db=new sqlite3.Database('chatapp.db');
db.run('ALTER TABLE users ADD COLUMN email TEXT;',[],(e)=>{
  console.log('add col error', e ? e.message : 'ok');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);',[],(e2)=>{
    console.log('index error', e2 ? e2.message : 'ok');
    db.all('PRAGMA table_info(users)',[],(e3,r)=>{console.log('schema after',r);db.close();});
  });
});
