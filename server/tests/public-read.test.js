import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv } from './helpers.js';
import { runSeed } from '../src/seed.js';

async function seededEnv(t) {
  const env = makeTestEnv(t);
  runSeed(env.db, { uploadsMaterialsDir: env.uploadsDir });
  return env;
}

test('GET /api/classes returns active classes with computed enrollment', async (t) => {
  const { base } = await seededEnv(t);
  const res = await fetch(`${base}/api/classes`);
  assert.equal(res.status, 200);
  const classes = await res.json();
  assert.equal(classes.length, 6);
  const g11 = classes.find((c) => c.grade === 'Grade 11' && c.subject === 'Mathematics');
  assert.equal(g11.capacity, 15);
  assert.equal(g11.seatsLeft, 15); // no active students assigned in seed
  assert.ok(Array.isArray(g11.sessions) && g11.sessions.length === 2);
  assert.equal(g11.sessions[0].dayOfWeek, 1);
});

test('GET /api/classes filters by grade and subject', async (t) => {
  const { base } = await seededEnv(t);
  const res = await fetch(`${base}/api/classes?grade=Grade%2010&subject=Mathematics`);
  const list = await res.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].medium, 'Sinhala');
});

test('GET /api/timetable groups sessions Mon-Sun', async (t) => {
  const { base } = await seededEnv(t);
  const res = await fetch(`${base}/api/timetable`);
  const days = await res.json();
  assert.equal(days.length, 7);
  assert.equal(days[0].dayOfWeek, 1);
  const monday = days[0].sessions;
  assert.equal(monday.length, 2); // two Math classes
  assert.ok(monday[0].subject && monday[0].startTime < monday[1].startTime);
  assert.equal(days[6].sessions.length, 0); // Sunday empty
});

test('GET /api/announcements returns parsed tags newest-first', async (t) => {
  const { base } = await seededEnv(t);
  const list = await (await fetch(`${base}/api/announcements`)).json();
  assert.equal(list.length, 5);
  assert.ok(Array.isArray(list[0].tags));
  assert.ok(new Date(list[0].publishedAt) >= new Date(list[1].publishedAt));
});
