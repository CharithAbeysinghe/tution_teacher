import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, jsonHeaders } from './helpers.js';

const validRegistration = {
  fullName: 'Chamari Perera',
  dateOfBirth: '2010-03-15',
  grade: 'Grade 9',
  school: 'Visakha Vidyalaya',
  parentName: 'Niran Perera',
  parentPhone: '0711234567',
  studentPhone: '',
  email: '',
  address: 'Colombo 06',
  subject: 'Mathematics',
  medium: 'Sinhala',
  previousResults: 'Term 1 - 72%',
  howDidYouHear: 'Facebook',
};

test('registration persists pending student', async (t) => {
  const { db, base } = makeTestEnv(t);
  const res = await fetch(`${base}/api/registrations`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(validRegistration) });
  assert.equal(res.status, 201);
  const { id } = await res.json();
  const row = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  assert.equal(row.full_name, 'Chamari Perera');
  assert.equal(row.preferred_grade, 'Grade 9');
  assert.equal(row.status, 'pending');
  assert.equal(row.access_code, null);
  assert.equal(row.parent_phone, '0711234567');
});

test('registration validation errors', async (t) => {
  const { base } = makeTestEnv(t);
  const bad = { ...validRegistration, fullName: '', parentPhone: 'abc', grade: 'Grade 99', subject: 'Art' };
  const res = await fetch(`${base}/api/registrations`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(bad) });
  assert.equal(res.status, 422);
  const { errors } = await res.json();
  assert.ok(errors.fullName && errors.parentPhone && errors.grade && errors.subject);
});

test('contact message persists', async (t) => {
  const { db, base } = makeTestEnv(t);
  const res = await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: 'Ruwan', phone: '0777777777', email: 'r@x.lk', message: 'Question about fees' }) });
  assert.equal(res.status, 201);
  const row = db.prepare('SELECT * FROM contact_messages').get();
  assert.equal(row.name, 'Ruwan');
  assert.equal(row.read_at, null);
});

test('contact message requires name and message', async (t) => {
  const { base } = makeTestEnv(t);
  const res = await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ message: 'x' }) });
  assert.equal(res.status, 422);
});
