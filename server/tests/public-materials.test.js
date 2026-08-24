import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv, jsonHeaders } from './helpers.js';

function fixtureMaterial(db, uploadsDir, { isFree }) {
  const stored = `fix-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  fs.writeFileSync(path.join(uploadsDir, stored), 'hello material');
  const info = db.prepare(`INSERT INTO materials (title, subject, grade, type, stored_name, original_name, size_bytes, mime_type, is_free)
    VALUES ('Fixture Paper', 'Mathematics', 'Grade 10', 'pdf', ?, 'paper.txt', 14, 'text/plain', ?)`)
    .run(stored, isFree ? 1 : 0);
  return { id: Number(info.lastInsertRowid), stored };
}

function fixtureActiveStudentWithCode(db) {
  const code = 'AC' + Math.random().toString(36).slice(2, 10).toUpperCase();
  db.prepare(`INSERT INTO students (full_name, preferred_subject, preferred_medium, status, access_code, enrolled_at)
    VALUES ('Code Owner', 'Mathematics', 'Sinhala', 'active', ?, '2024-09-01')`).run(code);
  return code;
}

function fixtureNonActiveStudentWithCode(db, status) {
  const code = 'AC' + Math.random().toString(36).slice(2, 10).toUpperCase();
  db.prepare(`INSERT INTO students (full_name, preferred_subject, preferred_medium, status, access_code, enrolled_at)
    VALUES ('Dormant Owner', 'Mathematics', 'Sinhala', ?, ?, '2024-09-01')`).run(status, code);
  return code;
}

test('materials list supports search/subject/free filters', async (t) => {
  const { db, base, uploadsDir } = makeTestEnv(t);
  fixtureMaterial(db, uploadsDir, { isFree: true });
  fixtureMaterial(db, uploadsDir, { isFree: false });
  let list = await (await fetch(`${base}/api/materials`)).json();
  assert.equal(list.length, 2);
  assert.ok(!('stored_name' in list[0]));
  assert.ok('downloadsCount' in list[0]);
  list = await (await fetch(`${base}/api/materials?free_only=true`)).json();
  assert.equal(list.length, 1);
  list = await (await fetch(`${base}/api/materials?search=fixture`)).json();
  assert.equal(list.length, 2); // title LIKE match case-insensitive
  list = await (await fetch(`${base}/api/materials?subject=English`)).json();
  assert.equal(list.length, 0);
});

test('free material downloads without code and increments counter', async (t) => {
  const { db, base, uploadsDir } = makeTestEnv(t);
  const m = fixtureMaterial(db, uploadsDir, { isFree: true });
  const res = await fetch(`${base}/api/materials/${m.id}/download`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /attachment/);
  assert.equal(await res.text(), 'hello material');
  assert.equal(db.prepare('SELECT downloads_count FROM materials WHERE id=?').get(m.id).downloads_count, 1);
});

test('member material requires valid active access code', async (t) => {
  const { db, base, uploadsDir } = makeTestEnv(t);
  const m = fixtureMaterial(db, uploadsDir, { isFree: false });
  const code = fixtureActiveStudentWithCode(db);

  let res = await fetch(`${base}/api/materials/${m.id}/download`);
  assert.equal(res.status, 403);
  res = await fetch(`${base}/api/materials/${m.id}/download?code=WRONGCODE1`);
  assert.equal(res.status, 403);
  res = await fetch(`${base}/api/materials/${m.id}/download?code=${code}`);
  assert.equal(res.status, 200);
});

test('non-active student with well-formed code is rejected for member material', async (t) => {
  const { db, base, uploadsDir } = makeTestEnv(t);
  const m = fixtureMaterial(db, uploadsDir, { isFree: false });
  const pendingCode = fixtureNonActiveStudentWithCode(db, 'pending');
  const inactiveCode = fixtureNonActiveStudentWithCode(db, 'inactive');

  let res = await fetch(`${base}/api/materials/${m.id}/download?code=${pendingCode}`);
  assert.equal(res.status, 403);
  res = await fetch(`${base}/api/materials/${m.id}/download?code=${inactiveCode}`);
  assert.equal(res.status, 403);
});

test('rejected member download leaves downloads_count unchanged', async (t) => {
  const { db, base, uploadsDir } = makeTestEnv(t);
  const m = fixtureMaterial(db, uploadsDir, { isFree: false });
  const dormantCode = fixtureNonActiveStudentWithCode(db, 'inactive');

  await fetch(`${base}/api/materials/${m.id}/download`);
  await fetch(`${base}/api/materials/${m.id}/download?code=WRONGCODE1`);
  await fetch(`${base}/api/materials/${m.id}/download?code=${dormantCode}`);
  assert.equal(db.prepare('SELECT downloads_count FROM materials WHERE id=?').get(m.id).downloads_count, 0);
});

test('unlock validates active code', async (t) => {
  const { db, base } = makeTestEnv(t);
  const code = fixtureActiveStudentWithCode(db);
  let res = await fetch(`${base}/api/materials/unlock`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ code }) });
  let body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.studentName, 'Code Owner');
  res = await fetch(`${base}/api/materials/unlock`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ code: 'NOPE1234' }) });
  assert.equal(res.status, 400);
});

test('download unknown id -> 404', async (t) => {
  const { base } = makeTestEnv(t);
  assert.equal((await fetch(`${base}/api/materials/9999/download`)).status, 404);
});
