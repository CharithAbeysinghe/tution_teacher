import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, loginAsAdmin, jsonHeaders } from './helpers.js';
import { runSeed } from '../src/seed.js';

// Seeded DB provides classes (FK targets) + admin account.
async function adminEnv(t) {
  const env = makeTestEnv(t);
  runSeed(env.db, { uploadsMaterialsDir: env.uploadsDir });
  const cookie = await loginAsAdmin(env.base, 'admin@aravindatuition.lk', 'admin123');
  return { ...env, cookie };
}

const reg = {
  fullName: 'A Student', dateOfBirth: '2010-01-01', grade: 'Grade 9', school: 'S',
  parentName: 'P', parentPhone: '0711111111', subject: 'Mathematics', medium: 'Sinhala',
};

async function registerStudent(base, over = {}) {
  const res = await fetch(`${base}/api/registrations`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ...reg, ...over }) });
  assert.equal(res.status, 201);
  return (await res.json()).id;
}

test('list pagination, status filter, search', async (t) => {
  const { base, cookie } = await adminEnv(t);
  await registerStudent(base);
  await registerStudent(base);

  let res = await fetch(`${base}/api/admin/students?status=pending`, { headers: { cookie } });
  assert.equal(res.status, 200);
  let page = await res.json();
  assert.equal(page.total, 2);

  res = await fetch(`${base}/api/admin/students?page=1&perPage=2&status=pending`, { headers: { cookie } });
  page = await res.json();
  assert.equal(page.data.length, 2);
  assert.equal(page.perPage, 2);

  res = await fetch(`${base}/api/admin/students`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ name: 'Zack Zone', phone: '0710000001', grade: 'Grade 10', subject: 'Mathematics' }) });
  assert.equal(res.status, 201);

  res = await fetch(`${base}/api/admin/students?search=zack`, { headers: { cookie } });
  page = await res.json();
  assert.equal(page.total, 1);
  assert.equal(page.data[0].fullName, 'Zack Zone');
});

test('direct create defaults active with access code and enrolled_at', async (t) => {
  const { base, cookie } = await adminEnv(t);
  const res = await fetch(`${base}/api/admin/students`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ name: 'Nuwan', phone: '0710000001', grade: 'Grade 10', subject: 'Mathematics' }) });
  assert.equal(res.status, 201);
  const s = await res.json();
  assert.equal(s.status, 'active');
  assert.ok(s.accessCode.startsWith('AC'));
  assert.match(s.enrolledAt, /^\d{4}-\d{2}-\d{2}$/);
});

test('approve flow mints access code once', async (t) => {
  const { base, cookie } = await adminEnv(t);
  const id = await registerStudent(base);
  let res = await fetch(`${base}/api/admin/students/${id}/status`, { method: 'PATCH', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ status: 'active' }) });
  const approved = await res.json();
  assert.ok(approved.accessCode.startsWith('AC'));
  assert.match(approved.enrolledAt, /^\d{4}-\d{2}-\d{2}$/);

  await fetch(`${base}/api/admin/students/${id}/status`, { method: 'PATCH', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ status: 'inactive' }) });
  res = await fetch(`${base}/api/admin/students/${id}/status`, { method: 'PATCH', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ status: 'active' }) });
  assert.equal((await res.json()).accessCode, approved.accessCode);
});

test('update assigns class; joins appear; public enrollment reflects approval', async (t) => {
  const { base, cookie, db } = await adminEnv(t);
  const mathG10 = db.prepare(`SELECT id FROM classes WHERE subject='Mathematics' AND grade='Grade 10'`).get().id;
  const id = await registerStudent(base);

  let res = await fetch(`${base}/api/admin/students/${id}`, { method: 'PUT', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ registeredClassId: mathG10 }) });
  assert.equal(res.status, 200);

  res = await fetch(`${base}/api/admin/students?status=pending`, { headers: { cookie } });
  const page = await res.json();
  assert.equal(page.data[0].classSubject, 'Mathematics');
  assert.equal(page.data[0].classGrade, 'Grade 10');

  await fetch(`${base}/api/admin/students/${id}/status`, { method: 'PATCH', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ status: 'active' }) });
  const classes = await (await fetch(`${base}/api/classes`)).json();
  const g10 = classes.find((c) => c.grade === 'Grade 10' && c.subject === 'Mathematics');
  assert.equal(g10.enrolled, 1);
});

test('delete removes student', async (t) => {
  const { base, cookie } = await adminEnv(t);
  const id = await registerStudent(base);
  const before = await (await fetch(`${base}/api/admin/students`, { headers: { cookie } })).json();
  const res = await fetch(`${base}/api/admin/students/${id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  const page = await (await fetch(`${base}/api/admin/students`, { headers: { cookie } })).json();
  assert.equal(page.total, before.total - 1);
  assert.ok(!page.data.find((s) => s.id === id));
});

test('unauthenticated students list blocked', async (t) => {
  const { base } = await adminEnv(t);
  assert.equal((await fetch(`${base}/api/admin/students`)).status, 401);
});
