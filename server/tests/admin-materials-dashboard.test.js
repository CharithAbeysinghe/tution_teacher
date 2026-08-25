import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv, loginAsAdmin } from './helpers.js';
import { runSeed } from '../src/seed.js';

async function adminEnv(t) {
  const env = makeTestEnv(t);
  runSeed(env.db, { uploadsMaterialsDir: env.uploadsDir });
  const cookie = await loginAsAdmin(env.base, 'admin@aravindatuition.lk', 'admin123');
  return { ...env, cookie };
}

function uploadForm(name = 'notes.pdf') {
  const fd = new FormData();
  fd.set('title', 'Unit Notes');
  fd.set('subject', 'Science');
  fd.set('grade', 'Grade 9');
  fd.set('type', 'pdf');
  fd.set('isFree', 'true');
  fd.set('file', new Blob([Buffer.from('%PDF-fake')], { type: 'application/pdf' }), name);
  return fd;
}

test('upload, toggle, delete material', async (t) => {
  const env = await adminEnv(t);
  let res = await fetch(`${env.base}/api/admin/materials`, { method: 'POST', headers: { cookie: env.cookie }, body: uploadForm() });
  assert.equal(res.status, 201);
  const mat = await res.json();
  assert.equal(mat.isFree, true);
  assert.ok(fs.existsSync(path.join(env.uploadsDir, mat.storedName)));

  res = await fetch(`${env.base}/api/admin/materials/${mat.id}/free-toggle`, { method: 'PATCH', headers: { cookie: env.cookie } });
  assert.equal((await res.json()).isFree, false);

  res = await fetch(`${env.base}/api/admin/materials/${mat.id}`, { method: 'DELETE', headers: { cookie: env.cookie } });
  assert.equal(res.status, 200);
  assert.ok(!fs.existsSync(path.join(env.uploadsDir, mat.storedName)));
});

test('upload rejects disallowed extension', async (t) => {
  const env = await adminEnv(t);
  const res = await fetch(`${env.base}/api/admin/materials`, { method: 'POST', headers: { cookie: env.cookie }, body: uploadForm('evil.exe') });
  assert.equal(res.status, 422);
});

test('dashboard stats compute correctly', async (t) => {
  const { db, base, cookie } = await adminEnv(t);
  const cls = db.prepare('SELECT id, fee FROM classes LIMIT 1').get();
  const insActive = db.prepare(`INSERT INTO students (full_name, preferred_grade, preferred_subject, preferred_medium, status, registered_class_id)
    VALUES (?, 'Grade 9', 'Mathematics', 'Sinhala', 'active', ?)`);
  insActive.run('A', cls.id);
  insActive.run('B', cls.id);
  db.prepare(`INSERT INTO students (full_name, preferred_grade, preferred_subject, preferred_medium, status)
    VALUES ('C', 'Grade 9', 'Mathematics', 'Sinhala', 'pending')`).run();

  const res = await fetch(`${base}/api/admin/dashboard`, { headers: { cookie } });
  const stats = await res.json();
  assert.equal(stats.totalStudents, 8);        // 5 seeded + A + B + C
  assert.equal(stats.activeStudents, 6);       // 4 seeded active + A + B
  assert.equal(stats.classesRunning, 6);
  assert.equal(stats.monthlyRevenue, cls.fee * 2); // only assigned actives count
  assert.equal(stats.enrollmentByMonth.length, 6);
});

test('dashboard requires auth', async (t) => {
  const env = await adminEnv(t);
  assert.equal((await fetch(`${env.base}/api/admin/dashboard`)).status, 401);
});
