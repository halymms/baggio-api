require('dotenv').config();
const fetch = require('node-fetch');

const base = 'http://localhost:4000';

async function test() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@baggio.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  if (!login.token) {
    console.error('Login failed', login);
    process.exit(1);
  }
  console.log('1. Login OK');

  const listRes = await fetch(`${base}/users`, {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  const users = await listRes.json();
  if (listRes.status !== 200) {
    console.error('List failed', users);
    process.exit(1);
  }
  if (users.some((u) => u.password !== undefined)) {
    console.error('Password leaked!');
    process.exit(1);
  }
  console.log('2. GET /users OK, count:', users.length);

  const testEmail = `teste_${Date.now()}@example.com`;
  const createRes = await fetch(`${base}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${login.token}`,
    },
    body: JSON.stringify({
      name: 'Test User',
      email: testEmail,
      password: 'senha123',
      role: 'viewer',
    }),
  });
  const created = await createRes.json();
  if (createRes.status !== 201) {
    console.error('Create failed', created);
    process.exit(1);
  }
  if (created.password) {
    console.error('Password in create response!');
    process.exit(1);
  }
  console.log('3. POST /users OK, id:', created.id);

  const dupRes = await fetch(`${base}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${login.token}`,
    },
    body: JSON.stringify({ name: 'Dup', email: testEmail, password: 'senha123' }),
  });
  const dup = await dupRes.json();
  if (dupRes.status !== 409) {
    console.error('Expected 409, got', dupRes.status, dup);
    process.exit(1);
  }
  console.log('4. Duplicate email 409 OK');

  const loginNew = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'senha123' }),
  });
  const newToken = await loginNew.json();
  if (!newToken.token) {
    console.error('New user login failed', newToken);
    process.exit(1);
  }
  console.log('5. New user login OK');

  const forbidden = await fetch(`${base}/users`, {
    headers: { Authorization: `Bearer ${newToken.token}` },
  });
  if (forbidden.status !== 403) {
    console.error('Expected 403 for viewer, got', forbidden.status);
    process.exit(1);
  }
  console.log('6. Viewer GET /users 403 OK');

  console.log('All tests passed');
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
