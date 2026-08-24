import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, insertAdmin, jsonHeaders } from './helpers.js';

test('login/me/logout lifecycle', async (t) => {
  const env = makeTestEnv(t);
  const { base } = env;
  insertAdmin(env.db);

  let res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'admin@test.lk', password: 'wrong' }) });
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'admin@test.lk', password: 'pass123' }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('session='));

  res = await fetch(`${base}/api/admin/me`, { headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'admin@test.lk');

  res = await fetch(`${base}/api/admin/me`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { cookie } });
  assert.equal(res.status, 200);
  res = await fetch(`${base}/api/admin/me`, { headers: { cookie } });
  assert.equal(res.status, 401);
});

test('login validation', async (t) => {
  const env = makeTestEnv(t);
  const res = await fetch(`${env.base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'notanemail' }) });
  assert.equal(res.status, 422);
});
