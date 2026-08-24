import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv } from './helpers.js';

test('migrations create all tables and health endpoint works', async (t) => {
  const { db, base } = makeTestEnv(t);
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map((r) => r.name);
  for (const name of ['users', 'classes', 'class_sessions', 'students', 'announcements', 'materials', 'contact_messages']) {
    assert.ok(tables.includes(name), `missing table ${name}`);
  }
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('unknown api path returns JSON 404', async (t) => {
  const { base } = makeTestEnv(t);
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});
