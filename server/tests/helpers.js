import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';
import { buildApp } from '../src/app.js';
import bcrypt from 'bcryptjs';

export function makeTestEnv(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuition-test-'));
  const db = openDb(path.join(dir, 'test.db'));
  runMigrations(db);
  const uploadsDir = path.join(dir, 'uploads', 'materials');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const app = buildApp({ db, uploadsDir, rateLimiting: false });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { db, base, uploadsDir, dir };
}

export function insertAdmin(db, email = 'admin@test.lk', password = 'pass123') {
  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run('Test Admin', email, bcrypt.hashSync(password, 10));
  return { email, password };
}

export async function loginAsAdmin(base, email = 'admin@test.lk', password = 'pass123') {
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

export const jsonHeaders = { 'Content-Type': 'application/json' };
