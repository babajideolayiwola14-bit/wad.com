// use built-in fetch (Node 18+)

async function run() {
  try {
    let res = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username:'tester', password:'Password1', email:'tester@example.com'})
    });
    console.log('/register status', res.status);
    console.log(await res.text());

    res = await fetch('http://localhost:3001/auth/request-reset', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'tester'})
    });
    console.log('/auth/request-reset status', res.status);
    console.log(await res.text());
  } catch(err) {
    console.error(err);
  }
}
run();