import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv } from './helpers.js';
import { runSeed } from '../src/seed.js';

test('seed populates admin, classes, students, announcements, materials', async (t) => {
  const { db, uploadsDir } = makeTestEnv(t);
  runSeed(db, { uploadsMaterialsDir: uploadsDir });

  assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM classes').get().c, 6);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM class_sessions').get().c, 12); // 6 classes × 2 days
  assert.equal(db.prepare('SELECT COUNT(*) c FROM students').get().c, 5);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM students WHERE status='active'").get().c, 4);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM announcements').get().c, 5);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM materials').get().c, 8);

  const mat = db.prepare('SELECT * FROM materials LIMIT 1').get();
  assert.ok(fs.existsSync(path.join(uploadsDir, mat.stored_name)), 'material file exists');

  const active = db.prepare("SELECT COUNT(*) c FROM students WHERE status='active' AND access_code IS NOT NULL AND enrolled_at IS NOT NULL").get().c;
  assert.equal(active, 4);
});

test('seed is idempotent', async (t) => {
  const { db, uploadsDir } = makeTestEnv(t);
  runSeed(db, { uploadsMaterialsDir: uploadsDir });
  runSeed(db, { uploadsMaterialsDir: uploadsDir }); // second run must not duplicate
  assert.equal(db.prepare('SELECT COUNT(*) c FROM classes').get().c, 6);
});
