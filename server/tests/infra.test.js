import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv } from './helpers.js';

test('session secret is stored inside the provided dataDir, not repo cwd', async (t) => {
  const { dir, base } = makeTestEnv(t);
  const secretPath = path.join(dir, 'session-secret.txt');
  await fetch(`${base}/api/classes`);
  assert.ok(fs.existsSync(secretPath), `expected ${secretPath} to exist`);
});

test('duplicate class session slots are rejected by unique index', (t) => {
  const { db } = makeTestEnv(t);
  const cls = db.prepare(
    "INSERT INTO classes (subject, grade, medium, fee, capacity) VALUES ('Mathematics','Grade 10','Sinhala',5000,20)"
  );
  const info = cls.run();
  const insert = db.prepare(
    'INSERT INTO class_sessions (class_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
  );
  insert.run(info.lastInsertRowid, 1, '16:00', '18:00');
  assert.throws(() => insert.run(info.lastInsertRowid, 1, '16:00', '19:00'));
});
