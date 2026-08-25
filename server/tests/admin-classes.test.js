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

const payload = {
  subject: 'Science', grade: 'Grade 11', medium: 'English', fee: 3000, capacity: 12,
  description: 'New class',
  sessions: [
    { dayOfWeek: 2, startTime: '16:00', endTime: '18:00', room: 'Room D' },
    { dayOfWeek: 5, startTime: '16:00', endTime: '18:00', room: 'Room D' },
  ],
};

test('create class with sessions; read back shape', async (t) => {
  const { base, cookie, db } = await adminEnv(t);
  const res = await fetch(`${base}/api/admin/classes`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify(payload) });
  assert.equal(res.status, 201);
  const cls = await res.json();
  assert.equal(cls.sessions.length, 2);
  assert.equal(cls.sessions[0].dayOfWeek, 2);
  assert.equal(cls.isActive, true);
  assert.ok(db.prepare(`SELECT * FROM classes WHERE subject='Science' AND grade='Grade 11'`).get());
});

test('inactive class hidden from public; PUT replaces sessions', async (t) => {
  const { base, cookie } = await adminEnv(t);
  let res = await fetch(`${base}/api/admin/classes`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify(payload) });
  const cls = await res.json();

  res = await fetch(`${base}/api/admin/classes/${cls.id}`, { method: 'PUT', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ ...payload, isActive: false, sessions: [payload.sessions[0]] }) });
  assert.equal((await res.json()).isActive, false);

  const pub = await (await fetch(`${base}/api/classes`)).json();
  assert.ok(!pub.some((c) => c.id === cls.id));

  const mine = (await (await fetch(`${base}/api/admin/classes`, { headers: { cookie } })).json()).find((c) => c.id === cls.id);
  assert.equal(mine.sessions.length, 1);
});

test('invalid dayOfWeek rejected', async (t) => {
  const { base, cookie } = await adminEnv(t);
  const res = await fetch(`${base}/api/admin/classes`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ ...payload, sessions: [{ dayOfWeek: 9, startTime: '10:00', endTime: '11:00' }] }) });
  assert.equal(res.status, 422);
});

test('delete cascades sessions', async (t) => {
  const { base, cookie, db } = await adminEnv(t);
  let res = await fetch(`${base}/api/admin/classes`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify(payload) });
  const cls = await res.json();
  res = await fetch(`${base}/api/admin/classes/${cls.id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM class_sessions WHERE class_id = ?').get(cls.id).c, 0);
});

test('unauthenticated blocked', async (t) => {
  const { base } = await adminEnv(t);
  assert.equal((await fetch(`${base}/api/admin/classes`)).status, 401);
});
