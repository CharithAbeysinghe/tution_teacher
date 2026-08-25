import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, loginAsAdmin, jsonHeaders } from './helpers.js';
import { runSeed } from '../src/seed.js';

async function adminEnv(t) {
  const env = makeTestEnv(t);
  runSeed(env.db, { uploadsMaterialsDir: env.uploadsDir });
  const cookie = await loginAsAdmin(env.base, 'admin@aravindatuition.lk', 'admin123');
  return { ...env, cookie };
}

test('announcement CRUD round-trip', async (t) => {
  const { base, cookie, db } = await adminEnv(t);
  let res = await fetch(`${base}/api/admin/announcements`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ title: 'T1', content: 'C1', type: 'warning', tags: ['All'] }) });
  assert.equal(res.status, 201);
  const ann = await res.json();
  assert.deepEqual(ann.tags, ['All']);
  assert.equal(ann.type, 'warning');

  res = await fetch(`${base}/api/admin/announcements/${ann.id}`, { method: 'PUT', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ title: 'T2' }) });
  assert.equal((await res.json()).title, 'T2');

  const pub = await (await fetch(`${base}/api/announcements`)).json();
  assert.equal(pub[0].title, 'T2');

  res = await fetch(`${base}/api/admin/announcements/${ann.id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM announcements').get().c, 5); // seed count
});

test('messages inbox flow', async (t) => {
  const { base, cookie } = await adminEnv(t);
  await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: 'R1', message: 'm1' }) });
  await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: 'R2', message: 'm2' }) });

  let msgs = await (await fetch(`${base}/api/admin/messages`, { headers: { cookie } })).json();
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].name, 'R2'); // newest first

  let unread = await (await fetch(`${base}/api/admin/messages?unreadOnly=1`, { headers: { cookie } })).json();
  assert.equal(unread.length, 2);

  let res = await fetch(`${base}/api/admin/messages/${msgs[0].id}/read`, { method: 'PATCH', headers: { cookie } });
  assert.equal(res.status, 200);
  unread = await (await fetch(`${base}/api/admin/messages?unreadOnly=1`, { headers: { cookie } })).json();
  assert.equal(unread.length, 1);

  res = await fetch(`${base}/api/admin/messages/${msgs[0].id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  msgs = await (await fetch(`${base}/api/admin/messages`, { headers: { cookie } })).json();
  assert.equal(msgs.length, 1);
});

test('unauthenticated announcements blocked', async (t) => {
  const { base } = await adminEnv(t);
  assert.equal((await fetch(`${base}/api/admin/announcements`)).status, 401);
});
