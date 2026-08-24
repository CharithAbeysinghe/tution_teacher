# Tuition Teacher Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing React SPA into a working full-stack tuition-centre app by adding an Express + SQLite backend (auth, CRUD, uploads, gated downloads, live dashboard) and wiring every existing page to real APIs.

**Architecture:** New `server/` folder — Express 4 app factory (`buildApp({db, uploadsDir, rateLimiting})`) with route factories receiving the `better-sqlite3` handle; SQL-file migrations applied on boot; signed-cookie admin sessions; files streamed through a gated download route. Frontend gains `src/app/lib/{api.ts,types.ts,hooks.ts}` and each page swaps hardcoded arrays for fetched data. No visual redesign.

**Tech Stack:** Node 20 (v20.19.0 present), Express ^4.21, better-sqlite3 ^11 (prebuilt for Node 20/win-x64), zod ^3, bcryptjs, cookie-session, multer ^2, express-rate-limit ^7; frontend unchanged stack (Vite 6, TS, React 18).

**Spec:** `docs/superpowers/specs/2026-08-24-tuition-backend-design.md` — read it first; it defines schema DDL, endpoint table, and semantics. Plan argues from spec section numbers like (§4), (§5).

## Global Constraints

- Node v20.19.0; npm 10.8.2 (frontend root uses npm per README; server has its own package.json)
- API JSON payloads camelCase; SQLite columns snake_case (spec §5 conventions)
- Enums — subjects: `Mathematics|Science|English`; grades: `Grade 6..Grade 11`; mediums: `Sinhala|English`; student status: `pending|active|inactive`; announcement types: `general|important|warning|info|new`
- `day_of_week`: ISO, 1=Monday … 7=Sunday
- Rate limits only when `rateLimiting !== false` passed to `buildApp`
- Never commit secrets; `server/data/`, `server/uploads/`, `server/node_modules/` gitignored
- Frontend: no redesign; minimal additions allowed (email field on admin login, Messages tab, inline unlock input)
- Backend tests: `node --test` runner + global fetch against ephemeral port, fresh temp DB per test file (no supertest)
- Every task ends with its verification command passing, then a git commit

---

### Task 1: Backend scaffold — package, db, migrations runner, app factory skeleton

**Files:**
- Create: `server/package.json`, `server/.gitignore`, `server/src/db.js`, `server/src/migrate.js`, `server/src/migrations/001_init.sql`, `server/src/app.js`, `server/src/index.js`, `server/tests/helpers.js`, `server/tests/scaffold.test.js`
- Modify: `.gitignore` (root)

**Interfaces:**
- Produces: `openDb(dbPath?)` → Database; `runMigrations(db)`; `buildApp({ db, uploadsDir, rateLimiting = true })` → express app; `makeTestEnv(t)` → `{ db, base, uploadsDir }`; `loginAsAdmin(base, email?, password?)` → cookie string
- Later tasks add routes by editing `src/app.js` and adding route modules.

- [x] **Step 1: Create server/package.json**

```json
{
  "name": "tuition-server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "seed": "node src/seed.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.10.0",
    "cookie-session": "^2.1.0",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "multer": "^2.0.1",
    "zod": "^3.24.2"
  }
}
```

Run: `cd server && npm install`
Expected: installs clean on win-x64 (prebuilt better-sqlite3 binary).

- [x] **Step 2: server/.gitignore + root .gitignore additions**

`server/.gitignore`:
```
node_modules/
data/
uploads/
```

Root `.gitignore` — append:
```
server/data/
server/uploads/
dist/
```

- [x] **Step 3: src/db.js**

```js
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

export function openDb(dbPath = DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
```

- [x] **Step 4: src/migrations/001_init.sql** (exact DDL from spec §4; parent columns nullable)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL CHECK (subject IN ('Mathematics','Science','English')),
  grade TEXT NOT NULL CHECK (grade IN ('Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11')),
  medium TEXT NOT NULL CHECK (medium IN ('Sinhala','English')),
  fee REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT ''
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  school TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  student_phone TEXT,
  email TEXT,
  address TEXT,
  preferred_grade TEXT NOT NULL DEFAULT 'Grade 6',
  preferred_subject TEXT NOT NULL,
  preferred_medium TEXT NOT NULL,
  previous_results TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive')),
  enrolled_at TEXT,
  access_code TEXT UNIQUE,
  registered_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general','important','warning','info','new')),
  tags TEXT NOT NULL DEFAULT '[]',
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('Mathematics','Science','English')),
  grade TEXT NOT NULL CHECK (grade IN ('Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11')),
  type TEXT NOT NULL CHECK (type IN ('pdf','video','image')),
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_sessions_class ON class_sessions(class_id);
CREATE INDEX idx_messages_created ON contact_messages(created_at DESC);
```

- [x] **Step 5: src/migrate.js**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

export function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    })();
  }
  return files.length;
}
```

- [x] **Step 6: src/middleware/auth.js + validate.js**

`src/middleware/auth.js`:
```js
export function requireAdmin(req, res, next) {
  if (!req.session?.adminId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
```

`src/middleware/validate.js`:
```js
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!errors[key]) errors[key] = issue.message;
      }
      return res.status(422).json({ errors });
    }
    req.body = result.data;
    next();
  };
}
```

- [x] **Step 7: src/app.js** (app factory; route modules created as placeholders below and filled in by later tasks)

**Definitive `src/app.js`** (routes wired directly; later tasks edit the route module imports):

```js
import express from 'express';
import cookieSession from 'cookie-session';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';

function getSessionSecret() {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const secretPath = path.join(dataDir, 'session-secret.txt');
  try {
    const s = fs.readFileSync(secretPath, 'utf8').trim();
    if (s) return s;
  } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, s);
  return s;
}

export function buildApp({ db, uploadsDir, rateLimiting = true }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || getSessionSecret()],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    httpOnly: true,
  }));

  app.use('/api', publicRoutes(db, { rateLimiting }));
  app.use('/api/admin', adminRoutes(db, { uploadsDir, rateLimiting }));

  // JSON 404 for unknown api paths
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Central error handler
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Payload too large' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
```

For Task 1 create placeholder route factories so the app boots:

`src/routes/public.js`:
```js
import { Router } from 'express';

export function publicRoutes(db, { rateLimiting = true } = {}) {
  const router = Router();
  router.get('/health', (req, res) => res.json({ ok: true }));
  return router;
}
```

`src/routes/admin.js`:
```js
import { Router } from 'express';

export function adminRoutes(db, { uploadsDir, rateLimiting = true } = {}) {
  const router = Router();
  return router;
}
```

- [x] **Step 8: src/index.js**

```js
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { runMigrations } from './migrate.js';
import { buildApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const port = Number(process.env.PORT || 3000);

const db = openDb();
const migrationsApplied = runMigrations(db);

const uploadsDir = path.join(rootDir, 'uploads', 'materials');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = buildApp({ db, uploadsDir });

// Serve built frontend in production
const distDir = path.join(rootDir, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port} (migrations ensured: ${migrationsApplied} files tracked)`);
});
```

- [x] **Step 9: tests/helpers.js**

```js
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
```

- [x] **Step 10: Write failing-ish smoke test first (TDD anchor)** — `tests/scaffold.test.js`

```js
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
```

- [x] **Step 11: Run tests**

Run: `cd server && npm test`
Expected: PASS (2 tests). If better-sqlite3 fails to load native binary, verify Node ABI matches prebuild or pin `better-sqlite3@11.x` latest patch.

- [x] **Step 12: Commit**

```bash
git add server .gitignore
git commit -m "feat(server): scaffold express+sqlite app with migrations and test harness"
```

---

### Task 2: Seed script with current mock data

**Files:**
- Create: `server/src/seed.js`, `server/tests/seed.test.js`

**Interfaces:**
- Consumes: `openDb`, `runMigrations`
- Produces: `runSeed(db, { uploadsMaterialsDir })` exported for tests; CLI entry seeds the real DB. Seeds: 1 admin (env ADMIN_EMAIL default `admin@aravindatuition.lk`, ADMIN_PASSWORD default `admin123`), 6 classes + sessions (from ClassesPage), 5 students (AdminPanel mock; active ones get access codes + enrolled_at), 5 announcements (AnnouncementsPage; types mapped normal→general, success→new), 8 materials rows each with a small placeholder file written to disk. Idempotent: exits early if any user exists.

- [x] **Step 1: Write failing test** — `tests/seed.test.js`

```js
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
```

- [x] **Step 2: Run** `cd server && npm test` — expect FAIL (`Cannot find module '../src/seed.js'`)

- [x] **Step 3: Implement src/seed.js**

Data mirrors the frontend mocks exactly. Structure:

```js
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { runMigrations } from './migrate.js';

const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];

export function runSeed(db, { uploadsMaterialsDir }) {
  const already = db.prepare('SELECT COUNT(*) c FROM users').get().c > 0;
  if (already) {
    console.log('Database already seeded — skipping.');
    return false;
  }

  const seedAll = db.transaction(() => {
    // --- admin ---
    const email = process.env.ADMIN_EMAIL || 'admin@aravindatuition.lk';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run('Mr. Aravinda', email, bcrypt.hashSync(password, 10));

    // --- classes + sessions (matches ClassesPage/TimetablePage mocks) ---
    const classes = [
      { subject: 'Mathematics', grade: 'Grade 10', medium: 'Sinhala', fee: 2500, capacity: 20, description: 'Comprehensive O/Level Mathematics covering algebra, geometry, statistics and advanced problem solving.', sessions: [[1, '16:00', '18:00', 'Room A'], [4, '16:00', '18:00', 'Room A']] },
      { subject: 'Mathematics', grade: 'Grade 11', medium: 'English', fee: 2500, capacity: 15, description: 'O/Level Mathematics (English medium) with intensive exam technique practice and past paper revision.', sessions: [[1, '18:00', '20:00', 'Room A'], [4, '18:00', '20:00', 'Room A']] },
      { subject: 'Science', grade: 'Grade 8', medium: 'Sinhala', fee: 2000, capacity: 20, description: 'Junior Science covering Biology, Chemistry, and Physics foundations with practical examples.', sessions: [[2, '15:30', '17:00', 'Room B'], [5, '15:30', '17:00', 'Room B']] },
      { subject: 'Science', grade: 'Grade 9', medium: 'Sinhala', fee: 2000, capacity: 20, description: 'Intermediate Science with deeper coverage of chemical equations, force, and living systems.', sessions: [[2, '17:00', '18:30', 'Room B'], [5, '17:00', '18:30', 'Room B']] },
      { subject: 'English', grade: 'Grade 6', medium: 'English', fee: 1800, capacity: 15, description: 'Foundation English focusing on grammar, comprehension, and creative writing for young learners.', sessions: [[3, '09:00', '10:30', 'Room C'], [6, '09:00', '10:30', 'Room C']] },
      { subject: 'English', grade: 'Grade 7', medium: 'English', fee: 1800, capacity: 15, description: 'Intermediate English with essay writing, letter writing, and comprehension skills development.', sessions: [[3, '10:30', '12:00', 'Room C'], [6, '10:30', '12:00', 'Room C']] },
    ];
    const insClass = db.prepare('INSERT INTO classes (subject, grade, medium, fee, description, capacity) VALUES (?, ?, ?, ?, ?, ?)');
    const insSession = db.prepare('INSERT INTO class_sessions (class_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)');
    for (const c of classes) {
      const { lastInsertRowid } = insClass.run(c.subject, c.grade, c.medium, c.fee, c.description, c.capacity);
      for (const [d, s, e, r] of c.sessions) insSession.run(lastInsertRowid, d, s, e, r);
    }

    // --- students (AdminPanel mock) ---
    const newCode = () => 'AC' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const insStudent = db.prepare(`INSERT INTO students
      (full_name, preferred_grade, preferred_subject, student_phone, status, enrolled_at, access_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const students = [
      ['Dilnoza Perera', 'Grade 11', 'Mathematics', '071 234 5678', 'active', '2024-09-01'],
      ['Kavindra Silva', 'Grade 9', 'Science', '077 345 6789', 'active', '2024-09-05'],
      ['Amali Fernando', 'Grade 10', 'Mathematics', '076 456 7890', 'active', '2024-09-10'],
      ['Nimal Jayawardena', 'Grade 7', 'English', '075 567 8901', 'inactive', null],
      ['Sithum Rathnayake', 'Grade 11', 'Mathematics', '071 678 9012', 'active', '2024-09-15'],
    ];
    for (const [name, grade, subject, phone, status, enrolledAt] of students) {
      insStudent.run(name, grade, subject, phone, status, enrolledAt, status === 'active' ? newCode() : null);
    }

    // --- announcements (AnnouncementsPage mock; type mapping noted) ---
    const insAnn = db.prepare('INSERT INTO announcements (title, content, type, tags, published_at) VALUES (?, ?, ?, ?, ?)');
    const announcements = [
      ['O/Level Intensive Revision — December 2024', 'Special intensive revision classes for Grade 11 O/Level students will commence from December 1st. Classes will be held daily (Mon–Sat) from 4:00–8:00 PM. Fee: Rs. 5,000 for the full programme. Please confirm attendance by November 28.', 'important', ['Grade 11', 'Mathematics', 'Revision'], '2024-11-20'],
      ['December Fee Payment Deadline', 'Monthly fees for December must be paid by December 5th. Students with outstanding fees will not receive study materials for that month. Payment can be made in person or via bank transfer. Contact us for bank account details.', 'warning', ['All Students', 'Fees'], '2024-11-15'],
      ['New Study Materials Uploaded', 'Past papers for 2022 and 2023 O/Level Mathematics (both Sinhala and English medium) have been uploaded to the Materials section. Please download and practice before the next class.', 'info', ['Mathematics', 'Grade 10', 'Grade 11'], '2024-11-10'],
      ['Class Holiday — Deepavali', 'There will be no classes on Monday, November 11 due to the Deepavali public holiday. All classes will resume on Tuesday, November 12. Wishing everyone a joyful celebration!', 'general', ['All Students'], '2024-11-01'],
      ['Grade 8 & 9 Science — New Batch Starting', 'A new batch for Grade 8 and 9 Science (Sinhala medium) will start from December 3rd. Available days: Tuesday & Friday, 3:30–6:30 PM. Only 5 seats remaining. Register soon!', 'new', ['Science', 'Grade 8', 'Grade 9', 'New Batch'], '2024-10-28'],
    ];
    for (const [title, content, type, tags, date] of announcements) {
      insAnn.run(title, content, type, JSON.stringify(tags), `${date} 10:00:00`);
    }

    // --- materials (MaterialsPage mock) + placeholder files ---
    const insMat = db.prepare(`INSERT INTO materials
      (title, subject, grade, type, stored_name, original_name, size_bytes, mime_type, is_free, downloads_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const materials = [
      ['O/Level Mathematics — 2023 Past Paper (Sinhala)', 'Mathematics', 'Grade 11', 'pdf', 'past-paper-2023-sinhala.pdf', 2450 * 1024, true, 245, '2024-11-10'],
      ['O/Level Mathematics — 2023 Past Paper (English)', 'Mathematics', 'Grade 11', 'pdf', 'past-paper-2023-english.pdf', 2150 * 1024, true, 189, '2024-11-10'],
      ['Algebra — Complete Notes (Grade 10)', 'Mathematics', 'Grade 10', 'pdf', 'algebra-notes-g10.pdf', 3890 * 1024, false, 102, '2024-10-22'],
      ['Statistics Practice Questions — Worksheet 1', 'Mathematics', 'Grade 10', 'pdf', 'statistics-ws1.pdf', 1230 * 1024, true, 178, '2024-10-15'],
      ['Science — Photosynthesis Video Lesson', 'Science', 'Grade 8', 'video', 'photosynthesis-lesson.mp4', 52 * 1024 * 1024, false, 67, '2024-11-05'],
      ['Science — Chemical Reactions Worksheet', 'Science', 'Grade 9', 'pdf', 'chemical-reactions-ws.pdf', 980 * 1024, true, 134, '2024-11-01'],
      ['English — Essay Writing Guide', 'English', 'Grade 7', 'pdf', 'essay-writing-guide.pdf', 1640 * 1024, true, 98, '2024-10-29'],
      ['English Comprehension — Advanced Exercises', 'English', 'Grade 7', 'pdf', 'comprehension-advanced.pdf', 2250 * 1024, false, 55, '2024-10-18'],
    ];
    for (const [title, subject, grade, type, fileName, size, free, downloads, date] of materials) {
      const storedName = `seed-${crypto.randomBytes(4).toString('hex')}-${fileName}`;
      fs.writeFileSync(path.join(uploadsMaterialsDir, storedName), `Placeholder file for ${title}\n`);
      const mime = type === 'video' ? 'video/mp4' : type === 'image' ? 'image/png' : 'application/pdf';
      insMat.run(title, subject, grade, type, storedName, fileName, size, mime, free ? 1 : 0, downloads, `${date} 09:00:00`);
    }
  });

  seedAll();
  console.log('Seeded database with demo data.');
  return true;
}

// CLI entry (Windows-safe main-module check)
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  const db = openDb();
  runMigrations(db);
  const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads', 'materials');
  fs.mkdirSync(uploadsDir, { recursive: true });
  runSeed(db, { uploadsMaterialsDir: uploadsDir });
  db.close();
}
```

(`fileURLToPath` is already imported at the top of seed.js with the other node imports.)

- [x] **Step 4: Run** `npm test` — expect ALL PASS (scaffold + seed)
- [x] **Step 5: Commit** `git add server/src/seed.js server/tests/seed.test.js && git commit -m "feat(server): seed demo data matching existing UI"`

---

### Task 3: Public read APIs — classes, timetable, announcements

**Files:**
- Modify: `server/src/routes/public.js`
- Test: `server/tests/public-read.test.js`

**Interfaces:**
- Produces:
  - `GET /api/classes?grade=&subject=` → `[{ id, subject, grade, medium, fee, description, capacity, enrolled, seats_left, sessions: [{ day_of_week, start_time, end_time, room }] }]` (active only, ordered by id)
  - `GET /api/timetable` → `[{ day_of_week, sessions: [{ start_time, end_time, subject, grade, medium, room }] }]` for days 1–7 always present
  - `GET /api/announcements` → `[{ id, title, content, type, tags: string[], published_at }]` newest first

- [x] **Step 1: Failing tests** — `tests/public-read.test.js`

```js
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
```

- [x] **Step 2: Run** `npm test` — new file FAILs (404), old pass
- [x] **Step 3: Implement** in `src/routes/public.js`:

```js
import { Router } from 'express';

const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
const SUBJECTS = ['Mathematics', 'Science', 'English'];

export function publicRoutes(db, { rateLimiting = true } = {}) {
  const router = Router();

  router.get('/health', (req, res) => res.json({ ok: true }));

  router.get('/classes', (req, res) => {
    const clauses = ['c.is_active = 1'];
    const params = [];
    if (req.query.grade && GRADES.includes(req.query.grade)) { clauses.push('c.grade = ?'); params.push(req.query.grade); }
    if (req.query.subject && SUBJECTS.includes(req.query.subject)) { clauses.push('c.subject = ?'); params.push(req.query.subject); }
    const rows = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.registered_class_id = c.id AND s.status = 'active') AS enrolled
      FROM classes c WHERE ${clauses.join(' AND ')} ORDER BY c.id
    `).all(...params);
    const sessStmt = db.prepare('SELECT day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime, room FROM class_sessions WHERE class_id = ? ORDER BY day_of_week, start_time');
    res.json(rows.map((c) => ({
      id: c.id,
      subject: c.subject,
      grade: c.grade,
      medium: c.medium,
      fee: c.fee,
      description: c.description,
      capacity: c.capacity,
      enrolled: c.enrolled,
      seatsLeft: c.capacity - c.enrolled,
      sessions: sessStmt.all(c.id),
    })));
  });

  router.get('/timetable', (req, res) => {
    const rows = db.prepare(`
      SELECT cs.day_of_week AS dayOfWeek, cs.start_time AS startTime, cs.end_time AS endTime,
             c.subject, c.grade, c.medium, cs.room
      FROM class_sessions cs JOIN classes c ON c.id = cs.class_id
      WHERE c.is_active = 1
      ORDER BY cs.day_of_week, cs.start_time
    `).all();
    const days = [];
    for (let d = 1; d <= 7; d++) days.push({ dayOfWeek: d, sessions: rows.filter((r) => r.dayOfWeek === d) });
    res.json(days);
  });

  router.get('/announcements', (req, res) => {
    const rows = db.prepare('SELECT id, title, content, type, tags, published_at AS publishedAt FROM announcements ORDER BY published_at DESC, id DESC').all();
    res.json(rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
  });

  return router;
}
```

- [x] **Step 4: Run** `npm test` — all PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): public classes/timetable/announcements APIs"`

---

### Task 4: Public materials — list, unlock, gated download

**Files:**
- Modify: `server/src/routes/public.js`, `server/tests/public-materials.test.js` (create)
- Consumes: helpers `makeTestEnv`; direct DB inserts for fixtures

**Interfaces:**
- Produces:
  - `GET /api/materials?search=&subject=&grade=&free_only=true` → `[{ id, title, subject, grade, type, sizeBytes, isFree, downloadsCount, createdAt }]`
  - `POST /api/materials/unlock { code }` → `{ ok: true, studentName }` | 400 `{ error }`
  - `GET /api/materials/:id/download?code=` → file stream (Content-Disposition attachment); non-free without valid active-student code → 403; unknown id → 404; increments `downloads_count` on success

- [x] **Step 1: Failing tests** — `tests/public-materials.test.js`

```js
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
```

- [x] **Step 2: Run** — FAIL (404s)
- [x] **Step 3: Implement** — append inside `publicRoutes` before `return router`:

```js
  router.get('/materials', (req, res) => {
    const clauses = ['1=1'];
    const params = [];
    if (req.query.search) { clauses.push('(m.title LIKE ? OR m.subject LIKE ?)'); params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    if (req.query.subject && SUBJECTS.includes(req.query.subject)) { clauses.push('m.subject = ?'); params.push(req.query.subject); }
    if (req.query.grade && GRADES.includes(req.query.grade)) { clauses.push('m.grade = ?'); params.push(req.query.grade); }
    if (req.query.free_only === 'true' || req.query.free_only === '1') clauses.push('m.is_free = 1');
    const rows = db.prepare(`
      SELECT id, title, subject, grade, type, size_bytes AS sizeBytes, is_free AS isFree,
             downloads_count AS downloadsCount, created_at AS createdAt
      FROM materials m WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC, id DESC
    `).all(...params);
    res.json(rows.map((r) => ({ ...r, isFree: !!r.isFree })));
  });

  router.post('/materials/unlock', unlockLimiter, (req, res) => {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const row = db.prepare(`SELECT full_name FROM students WHERE access_code = ? AND status = 'active'`).get(code);
    if (!row) return res.status(400).json({ error: 'Invalid or expired access code' });
    res.json({ ok: true, studentName: row.full_name });
  });

  router.get('/materials/:id/download', (req, res) => {
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    if (!mat) return res.status(404).json({ error: 'Material not found' });
    if (!mat.is_free) {
      const code = String(req.query.code || '').trim().toUpperCase();
      const owner = db.prepare(`SELECT id FROM students WHERE access_code = ? AND status = 'active'`).get(code);
      if (!owner) return res.status(403).json({ error: 'Members-only material. A valid access code is required.' });
    }
    const filePath = path.join(uploadsDir, mat.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing' });
    db.prepare('UPDATE materials SET downloads_count = downloads_count + 1 WHERE id = ?').run(mat.id);
    res.download(filePath, mat.original_name);
  });
```

Imports to add at top of public.js: `path from 'node:path'`, `fs from 'node:fs'`, `rateLimit from 'express-rate-limit'`. Limiter near top of factory:

```js
  const mkLimiter = (windowMs, max) => rateLimiting ? rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }) : (req, res, next) => next();
  const unlockLimiter = mkLimiter(15 * 60 * 1000, 20);
  const intakeLimiter = mkLimiter(60 * 60 * 1000, 10);   // used by Task 5
```

- [x] **Step 4: Run** `npm test` — all PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): materials listing, unlock, gated download with counters"`

---

### Task 5: Public intake — registrations + contact messages

**Files:**
- Modify: `server/src/routes/public.js`
- Test: `server/tests/intake.test.js` (create)

**Interfaces:**
- Produces:
  - `POST /api/registrations` body `{ fullName*, dateOfBirth*, grade*, school*, parentName*, parentPhone*, studentPhone?, email?, address?, subject*, medium*, previousResults?, howDidYouHear? }` → 201 `{ id }`; creates student `status='pending'`
  - `POST /api/contact-messages` body `{ name*, phone?, email?, message* }` → 201 `{ id }`
  - Validation failures → 422 `{ errors: { field: msg } }`

- [x] **Step 1: Failing tests** — `tests/intake.test.js`

```js
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
```

- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement** — append in `publicRoutes`:

```js
  const phoneRe = /^[0-9+\-\s]{7,15}$/;
  const registrationSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    grade: z.enum(GRADES),
    school: z.string().trim().min(1, 'School is required'),
    parentName: z.string().trim().min(1, 'Parent/guardian name is required'),
    parentPhone: z.string().regex(phoneRe, 'Enter a valid phone number'),
    studentPhone: z.string().regex(phoneRe).optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    subject: z.enum(SUBJECTS),
    medium: z.enum(['Sinhala', 'English']),
    previousResults: z.string().optional().or(z.literal('')),
    howDidYouHear: z.string().optional().or(z.literal('')),
  });

  router.post('/registrations', intakeLimiter, validate(registrationSchema), (req, res) => {
    const b = req.body;
    const info = db.prepare(`
      INSERT INTO students (full_name, date_of_birth, school, parent_name, parent_phone, student_phone, email, address,
                            preferred_grade, preferred_subject, preferred_medium, previous_results, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(b.fullName, b.dateOfBirth, b.school, b.parentName, b.parentPhone,
           b.studentPhone || null, b.email || null, b.address || null,
           b.grade, b.subject, b.medium, b.previousResults || null, b.howDidYouHear || null);
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });

  const contactSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().regex(phoneRe).optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    message: z.string().trim().min(1, 'Message is required'),
  });

  router.post('/contact-messages', intakeLimiter, validate(contactSchema), (req, res) => {
    const b = req.body;
    const info = db.prepare('INSERT INTO contact_messages (name, phone, email, message) VALUES (?, ?, ?, ?)')
      .run(b.name, b.phone || null, b.email || null, b.message);
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  });
```

Add imports at top: `z from 'zod'`, `validate from '../middleware/validate.js'`.

- [x] **Step 4: Run** `npm test` — PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): public registration and contact intake with validation"`

---

### Task 6: Admin authentication

**Files:**
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-auth.test.js` (create)

**Interfaces:**
- Produces:
  - `POST /api/admin/login { email, password }` → 200 `{ id, name, email }` + session cookies; wrong creds → 401 `{ error }`; validation → 422
  - `POST /api/admin/logout` → `{ ok: true }` and clears session
  - `GET /api/admin/me` (requireAdmin) → `{ id, name, email }` | 401
  - Helper export reused everywhere: `requireAdmin` from `../middleware/auth.js`

- [x] **Step 1: Failing tests** — `tests/admin-auth.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, insertAdmin, jsonHeaders } from './helpers.js';

test('login/me/logout lifecycle', async (t) => {
  const env = makeTestEnv(t);
  const { base } = env;
  insertAdmin(env.db);

  let res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'admin@test.lk', password: 'wrong' }) });
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'admin@test.lk', password: 'pass123' }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('session='));

  res = await fetch(`${base}/api/admin/me`, { headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'admin@test.lk');

  res = await fetch(`${base}/api/admin/me`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { cookie } });
  assert.equal(res.status, 200);
  res = await fetch(`${base}/api/admin/me`, { headers: { cookie } });
  assert.equal(res.status, 401);
});

test('login validation', async (t) => {
  const env = makeTestEnv(t);
  const res = await fetch(`${env.base}/api/admin/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'notanemail' }) });
  assert.equal(res.status, 422);
});
```

- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement** — replace `src/routes/admin.js`:

```js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export function adminRoutes(db, { uploadsDir, rateLimiting = true } = {}) {
  const router = Router();

  router.post('/login', (req, res) => {
    const schema = z.object({
      email: z.string().email('Valid email required'),
      password: z.string().min(1, 'Password required'),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(422).json({ errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.') || '_', i.message])) });
    }
    const { email, password } = parsed.data;
    const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.adminId = user.id;
    res.json({ id: user.id, name: user.name, email: user.email });
  });

  router.post('/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
  });

  router.get('/me', requireAdmin, (req, res) => {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.adminId);
    if (!user) { req.session = null; return res.status(401).json({ error: 'Unauthorized' }); }
    res.json(user);
  });

  return router;
}
```

Also add a login rate limiter: wrap handler — `router.post('/login', mkLimiter(15*60*1000, 5), handler)` using same `mkLimiter` helper pattern from Task 4 (duplicate tiny helper here since separate module).

- [x] **Step 4: Run** `npm test` — PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): admin auth with signed-cookie sessions"`

---

### Task 7: Admin students management (list/create/update/status/delete)

**Files:**
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-students.test.js` (create)

**Interfaces:**
- Produces:
  - `GET /api/admin/students?status=&search=&page=1&perPage=20` → `{ data: Student[], total, page, perPage }`; Student includes joined `class_subject`, `class_grade`
  - `POST /api/admin/students { name*, phone*, grade*, subject*, medium?, status?, enrolledAt? }` → 201 Student (direct-add defaults active/enrolled today/access code minted)
  - `PUT /api/admin/students/:id` partial `{ fullName?, studentPhone?, parentName?, parentPhone?, grade?, subject?, medium?, registeredClassId? , address?, email?, school? }` → updated Student
  - `PATCH /api/admin/students/:id/status { status }` → Student; transition-to-active mints access_code if missing + fills enrolled_at
  - `DELETE /api/admin/students/:id` → `{ ok: true }`

- [x] **Step 1: Failing tests** — `tests/admin-students.test.js`

```js
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
  const res = await fetch(`${base}/api/admin/students/${id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  const page = await (await fetch(`${base}/api/admin/students`, { headers: { cookie } })).json();
  assert.equal(page.total, 0);
});

test('unauthenticated students list blocked', async (t) => {
  const { base } = await adminEnv(t);
  assert.equal((await fetch(`${base}/api/admin/students`)).status, 401);
});
```

- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement** — append in `adminRoutes` after `/me`:

Shared row mapper:

```js
  const studentSelect = `
    SELECT s.*, c.subject AS class_subject, c.grade AS class_grade
    FROM students s LEFT JOIN classes c ON c.id = s.registered_class_id`;
  function mapStudent(r) {
    return {
      id: r.id, fullName: r.full_name, dateOfBirth: r.date_of_birth, school: r.school,
      parentName: r.parent_name, parentPhone: r.parent_phone, studentPhone: r.student_phone,
      email: r.email, address: r.address,
      preferredGrade: r.preferred_grade,
      preferredSubject: r.preferred_subject, preferredMedium: r.preferred_medium,
      previousResults: r.previous_results, source: r.source,
      status: r.status, enrolledAt: r.enrolled_at, accessCode: r.access_code,
      registeredClassId: r.registered_class_id, classSubject: r.class_subject, classGrade: r.class_grade,
      createdAt: r.created_at,
    };
  }
```

Endpoints:

```js
  router.get('/students', requireAdmin, (req, res) => {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage) || 20));
    const where = []; const params = [];
    if (status && ['pending', 'active', 'inactive'].includes(status)) { where.push('s.status = ?'); params.push(status); }
    if (search) { where.push('(s.full_name LIKE ? OR s.student_phone LIKE ? OR s.parent_phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) c FROM students s ${whereSql}`).get(...params).c;
    const rows = db.prepare(`${studentSelect} ${whereSql} ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`)
      .all(...params, perPage, (page - 1) * perPage);
    res.json({ data: rows.map(mapStudent), total, page, perPage });
  });

  const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
  const SUBJECTS = ['Mathematics', 'Science', 'English'];
  const newAccessCode = () => 'AC' + crypto.randomBytes(4).toString('hex').toUpperCase();

  router.post('/students', requireAdmin, (req, res) => {
    const schema = z.object({
      name: z.string().trim().min(1),
      phone: z.string().regex(/^[0-9+\-\s]{7,15}$/),
      grade: z.enum(GRADES),
      subject: z.enum(SUBJECTS),
      medium: z.enum(['Sinhala', 'English']).optional(),
      status: z.enum(['active', 'inactive']).default('active'),
      enrolledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });
    const p = schema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.') || '_', i.message])) });
    const b = p.data;
    const today = new Date().toISOString().slice(0, 10);
    const code = b.status === 'active' ? newAccessCode() : null;
    const info = db.prepare(`INSERT INTO students (full_name, student_phone, preferred_grade, preferred_subject, preferred_medium, status, enrolled_at, access_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(b.name, b.phone, b.grade, b.subject, b.medium || 'Sinhala', b.status, b.enrolledAt || today, code);
    const row = db.prepare(`${studentSelect} WHERE s.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(mapStudent(row));
  });
```

Continuing endpoints:

```js
  router.put('/students/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found' });
    const schema = z.object({
      fullName: z.string().trim().min(1).optional(),
      studentPhone: z.string().regex(/^[0-9+\-\s]{7,15}$/).optional().or(z.literal('')),
      parentName: z.string().optional().or(z.literal('')),
      parentPhone: z.string().regex(/^[0-9+\-\s]{7,15}$/).optional().or(z.literal('')),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional().or(z.literal('')),
      school: z.string().optional().or(z.literal('')),
      preferredGrade: z.enum(GRADES).optional(),
      preferredSubject: z.enum(SUBJECTS).optional(),
      preferredMedium: z.enum(['Sinhala', 'English']).optional(),
      registeredClassId: z.number().int().nullable().optional(),
    });
    const p = schema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.') || '_', i.message])) });
    const b = p.data;
    const colMap = {
      fullName: 'full_name', studentPhone: 'student_phone', parentName: 'parent_name',
      parentPhone: 'parent_phone', email: 'email', address: 'address', school: 'school',
      preferredGrade: 'preferred_grade', preferredSubject: 'preferred_subject',
      preferredMedium: 'preferred_medium',
    };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(colMap)) {
      if (b[k] !== undefined) { sets.push(`${col} = ?`); params.push(b[k] === '' ? null : b[k]); }
    }
    if (b.registeredClassId !== undefined) { sets.push('registered_class_id = ?'); params.push(b.registeredClassId); }
    if (!sets.length) return res.json(mapStudent(existing));
    sets.push(`updated_at = datetime('now')`);
    db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...params, existing.id);
    res.json(mapStudent(db.prepare(`${studentSelect} WHERE s.id = ?`).get(existing.id)));
  });

  router.patch('/students/:id/status', requireAdmin, (req, res) => {
    const schema = z.object({ status: z.enum(['pending', 'active', 'inactive']) });
    const p = schema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: { status: 'Invalid status' } });
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found' });
    const { status } = p.data;
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`UPDATE students SET status = ?,
        enrolled_at = CASE WHEN ? = 'active' AND enrolled_at IS NULL THEN ? ELSE enrolled_at END,
        access_code = CASE WHEN ? = 'active' AND access_code IS NULL THEN ? ELSE access_code END,
        updated_at = datetime('now')
      WHERE id = ?`).run(status, status, today, status, newAccessCode(), existing.id);
    res.json(mapStudent(db.prepare(`${studentSelect} WHERE s.id = ?`).get(existing.id)));
  });

  router.delete('/students/:id', requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Student not found' });
    res.json({ ok: true });
  });
```

Add `import crypto from 'node:crypto';` to admin.js.

- [x] **Step 4: Run** `npm test` — PASS (after applying the `preferred_grade` amendment to migration/seeder/registration from the note above)
- [x] **Step 5: Commit** `git commit -am "feat(server): admin student management with approval + access codes"`

---

### Task 8: Admin classes CRUD with schedule sessions

**Files:**
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-classes.test.js` (create)

**Interfaces:**
- Produces:
  - `GET /api/admin/classes` → same shape as public plus `is_active: boolean` and includes inactive
  - `POST /api/admin/classes { subject*, grade*, medium*, fee*>0, capacity*>0, description?, isActive?, sessions: [{ dayOfWeek* 1-7, startTime* HH:MM, endTime* HH:MM, room? }] }` → 201 Class
  - `PUT /api/admin/classes/:id` — same body; when `sessions` provided, replaces all atomically
  - `DELETE /api/admin/classes/:id` → `{ ok: true }` (sessions cascade; students unassigned)

- [x] **Step 1: Failing tests** — `tests/admin-classes.test.js` (copy the same `adminEnv` helper from Task 7's test file):

```js
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
```
- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement** — append:

```js
  function classRowMapper(c) {
    const enrolled = db.prepare(`SELECT COUNT(*) n FROM students WHERE registered_class_id = ? AND status = 'active'`).get(c.id).n;
    return {
      id: c.id, subject: c.subject, grade: c.grade, medium: c.medium, fee: c.fee,
      description: c.description, capacity: c.capacity, isActive: !!c.is_active,
      enrolled, seatsLeft: c.capacity - enrolled,
      sessions: db.prepare('SELECT day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime, room FROM class_sessions WHERE class_id = ? ORDER BY day_of_week, start_time').all(c.id),
    };
  }

  const sessionSchema = z.object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    room: z.string().optional().default(''),
  });
  const classSchema = z.object({
    subject: z.enum(SUBJECTS),
    grade: z.enum(GRADES),
    medium: z.enum(['Sinhala', 'English']),
    fee: z.number().positive(),
    capacity: z.number().int().positive(),
    description: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true),
    sessions: z.array(sessionSchema).min(1),
  });

  router.get('/classes', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM classes ORDER BY id').all().map(classRowMapper));
  });

  const insertSessions = db.transaction((classId, sessions) => {
    const st = db.prepare('INSERT INTO class_sessions (class_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)');
    for (const s of sessions) st.run(classId, s.dayOfWeek, s.startTime, s.endTime, s.room || '');
  });

  router.post('/classes', requireAdmin, (req, res) => {
    const p = classSchema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    const b = p.data;
    const tx = db.transaction(() => {
      const info = db.prepare('INSERT INTO classes (subject, grade, medium, fee, description, capacity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(b.subject, b.grade, b.medium, b.fee, b.description, b.capacity, b.isActive ? 1 : 0);
      insertSessions(Number(info.lastInsertRowid), b.sessions);
      return Number(info.lastInsertRowid);
    });
    const id = tx();
    res.status(201).json(classRowMapper(db.prepare('SELECT * FROM classes WHERE id = ?').get(id)));
  });

  router.put('/classes/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Class not found' });
    const p = classSchema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    const b = p.data;
    const tx = db.transaction(() => {
      db.prepare(`UPDATE classes SET subject=?, grade=?, medium=?, fee=?, description=?, capacity=?, is_active=?, updated_at=datetime('now') WHERE id=?`)
        .run(b.subject, b.grade, b.medium, b.fee, b.description, b.capacity, b.isActive ? 1 : 0, existing.id);
      db.prepare('DELETE FROM class_sessions WHERE class_id = ?').run(existing.id);
      insertSessions(existing.id, b.sessions);
    });
    tx();
    res.json(classRowMapper(db.prepare('SELECT * FROM classes WHERE id = ?').get(existing.id)));
  });

  router.delete('/classes/:id', requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true });
  });
```

- [x] **Step 4: Run** `npm test` — PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): admin classes CRUD with weekly schedule"`

---

### Task 9: Admin announcements CRUD + contact messages inbox

**Files:**
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-content.test.js` (create)

**Interfaces:**
- Produces:
  - `GET /api/admin/announcements` → all, `tags: string[]`
  - `POST /api/admin/announcements { title*, content*, type?, tags?: string[] }` → 201 (published_at now)
  - `PUT /api/admin/announcements/:id { title?, content?, type?, tags? }` → 200
  - `DELETE /api/admin/announcements/:id` → `{ ok:true }`
  - `GET /api/admin/messages?unreadOnly=1` → `[{ id, name, phone, email, message, read_at, createdAt }]` newest first
  - `PATCH /api/admin/messages/:id/read` → marks read
  - `DELETE /api/admin/messages/:id`

- [x] **Step 1: Failing tests** — `tests/admin-content.test.js` (same `adminEnv` helper pattern as Tasks 7/8):

```js
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

test('announcement CRUD round-trip', async (t) => {
  const { base, cookie, db } = await adminEnv(t);
  let res = await fetch(`${base}/api/admin/announcements`, { method: 'POST', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ title: 'T1', content: 'C1', type: 'warning', tags: ['All'] }) });
  assert.equal(res.status, 201);
  const ann = await res.json();
  assert.deepEqual(ann.tags, ['All']);
  assert.equal(ann.type, 'warning');

  res = await fetch(`${base}/api/admin/announcements/${ann.id}`, { method: 'PUT', headers: { ...jsonHeaders, cookie }, body: JSON.stringify({ title: 'T2' }) });
  assert.equal((await res.json()).title, 'T2');

  const pub = await (await fetch(`${base}/api/announcements`)).json();
  assert.equal(pub[0].title, 'T2');

  res = await fetch(`${base}/api/admin/announcements/${ann.id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM announcements').get().c, 5); // seed count
});

test('messages inbox flow', async (t) => {
  const { base, cookie } = await adminEnv(t);
  await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: 'R1', message: 'm1' }) });
  await fetch(`${base}/api/contact-messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: 'R2', message: 'm2' }) });

  let msgs = await (await fetch(`${base}/api/admin/messages`, { headers: { cookie } })).json();
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].name, 'R2'); // newest first

  let unread = await (await fetch(`${base}/api/admin/messages?unreadOnly=1`, { headers: { cookie } })).json();
  assert.equal(unread.length, 2);

  let res = await fetch(`${base}/api/admin/messages/${msgs[0].id}/read`, { method: 'PATCH', headers: { cookie } });
  assert.equal(res.status, 200);
  unread = await (await fetch(`${base}/api/admin/messages?unreadOnly=1`, { headers: { cookie } })).json();
  assert.equal(unread.length, 1);

  res = await fetch(`${base}/api/admin/messages/${msgs[0].id}`, { method: 'DELETE', headers: { cookie } });
  assert.equal(res.status, 200);
  msgs = await (await fetch(`${base}/api/admin/messages`, { headers: { cookie } })).json();
  assert.equal(msgs.length, 1);
});

test('unauthenticated announcements blocked', async (t) => {
  const { base } = await adminEnv(t);
  assert.equal((await fetch(`${base}/api/admin/announcements`)).status, 401);
});
```
- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement** — append (pattern identical to prior tasks):

```js
  const annSchema = z.object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    type: z.enum(['general', 'important', 'warning', 'info', 'new']).default('general'),
    tags: z.array(z.string().trim().min(1)).max(8).optional().default([]),
  });
  function mapAnnouncement(r) {
    return { id: r.id, title: r.title, content: r.content, type: r.type, tags: JSON.parse(r.tags || '[]'), publishedAt: r.published_at, createdAt: r.created_at };
  }

  router.get('/announcements', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM announcements ORDER BY published_at DESC, id DESC').all().map(mapAnnouncement));
  });
  router.post('/announcements', requireAdmin, (req, res) => {
    const p = annSchema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    const b = p.data;
    const info = db.prepare('INSERT INTO announcements (title, content, type, tags) VALUES (?, ?, ?, ?)')
      .run(b.title, b.content, b.type, JSON.stringify(b.tags));
    res.status(201).json(mapAnnouncement(db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid)));
  });
  router.put('/announcements/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const p = annSchema.partial().safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    const b = p.data;
    db.prepare(`UPDATE announcements SET title=?, content=?, type=?, tags=?, updated_at=datetime('now') WHERE id=?`)
      .run(b.title ?? existing.title, b.content ?? existing.content, b.type ?? existing.type,
           b.tags !== undefined ? JSON.stringify(b.tags) : existing.tags, existing.id);
    res.json(mapAnnouncement(db.prepare('SELECT * FROM announcements WHERE id = ?').get(existing.id)));
  });
  router.delete('/announcements/:id', requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  function mapMessage(r) {
    return { id: r.id, name: r.name, phone: r.phone, email: r.email, message: r.message, readAt: r.read_at, createdAt: r.created_at };
  }
  router.get('/messages', requireAdmin, (req, res) => {
    const sql = req.query.unreadOnly === '1'
      ? 'SELECT * FROM contact_messages WHERE read_at IS NULL ORDER BY created_at DESC'
      : 'SELECT * FROM contact_messages ORDER BY created_at DESC';
    res.json(db.prepare(sql).all().map(mapMessage));
  });
  router.patch('/messages/:id/read', requireAdmin, (req, res) => {
    const info = db.prepare(`UPDATE contact_messages SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`).run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found or already read' });
    res.json({ ok: true });
  });
  router.delete('/messages/:id', requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
```

- [x] **Step 4: Run** `npm test` — PASS
- [x] **Step 5: Commit** `git commit -am "feat(server): announcements CRUD and contact inbox endpoints"`

---

### Task 10: Admin materials upload + dashboard stats

**Files:**
- Create: `server/src/lib/stats.js`
- Modify: `server/src/routes/admin.js`
- Test: `server/tests/admin-materials-dashboard.test.js` (create)

**Interfaces:**
- Produces:
  - `dashboardStats(db)` (lib) → `{ totalStudents, activeStudents, classesRunning, monthlyRevenue, enrollmentByMonth: [{month:'Jul', students:n}] }` (last 6 calendar months incl. current)
  - `GET /api/admin/dashboard` → that object
  - `GET /api/admin/materials` → full rows (adds `originalName`, `sizeBytes`, `isFree`, `downloadsCount`, `createdAt`, `mimeType`)
  - `POST /api/admin/materials` multipart fields `title,subject,grade,type,isFree` + `file` → 201 Material; rejects disallowed ext (pdf/mp4/jpg/jpeg/png/webp/gif) 422, >50MB → 413
  - `PATCH /api/admin/materials/:id/free-toggle` → flips `isFree`
  - `DELETE /api/admin/materials/:id` → removes row + disk file best-effort

- [x] **Step 1: stats lib** — `server/src/lib/stats.js`:

```js
export function dashboardStats(db) {
  const totalStudents = db.prepare('SELECT COUNT(*) c FROM students').get().c;
  const activeStudents = db.prepare(`SELECT COUNT(*) c FROM students WHERE status='active'`).get().c;
  const classesRunning = db.prepare('SELECT COUNT(*) c FROM classes WHERE is_active = 1').get().c;
  const monthlyRevenue = db.prepare(`
    SELECT COALESCE(SUM(c.fee), 0) v
    FROM students s JOIN classes c ON c.id = s.registered_class_id
    WHERE s.status = 'active'
  `).get().v;

  const enrollmentByMonth = [];
  const stmt = db.prepare(`SELECT COUNT(*) c FROM students WHERE strftime('%Y-%m', created_at) = ?`);
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    enrollmentByMonth.push({ month: d.toLocaleString('en-US', { month: 'short' }), students: stmt.get(key).c });
  }
  return { totalStudents, activeStudents, classesRunning, monthlyRevenue, enrollmentByMonth };
}
```

- [x] **Step 2: Failing tests** — `tests/admin-materials-dashboard.test.js` (same `adminEnv` helper pattern; multipart via global `FormData` + `Blob` in Node 20):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv, loginAsAdmin, jsonHeaders } from './helpers.js';
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
    VALUES ('C', 'Grade 9', 'Mathematics', 'Sinhala', 'pending')`);

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
```

- [x] **Step 3: Implement** — admin.js additions:

```js
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = ['.pdf', '.mp4', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
      cb(ok.includes(path.extname(file.originalname).toLowerCase()) ? null : new Error('DISALLOWED_EXT'), true);
    },
  });

  const MATERIAL_TYPES = { pdf: 'application/pdf', video: 'video/mp4', image: 'image/png' };

  router.get('/materials', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM materials ORDER BY created_at DESC, id DESC').all().map((r) => ({
      id: r.id, title: r.title, subject: r.subject, grade: r.grade, type: r.type,
      storedName: r.stored_name, originalName: r.original_name, sizeBytes: r.size_bytes,
      mimeType: r.mime_type, isFree: !!r.is_free, downloadsCount: r.downloads_count, createdAt: r.created_at,
    })));
  });

  router.post('/materials', requireAdmin, upload.single('file'), (req, res, next) => {
    const { title, subject, grade, type } = req.body;
    const schema = z.object({
      title: z.string().trim().min(1),
      subject: z.enum(SUBJECTS),
      grade: z.enum(GRADES),
      type: z.enum(Object.keys(MATERIAL_TYPES)),
      isFree: z.string().optional().default('false'),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    if (!req.file) return res.status(422).json({ errors: { file: 'File is required' } });
    const info = db.prepare(`INSERT INTO materials (title, subject, grade, type, stored_name, original_name, size_bytes, mime_type, is_free)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(p.data.title, p.data.subject, p.data.grade, p.data.type, req.file.filename,
           req.file.originalname, req.file.size, req.file.mimetype, p.data.isFree === 'true' ? 1 : 0);
    const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ id: row.id, title: row.title, isFree: !!row.is_free, storedName: row.stored_name });
  });

  router.patch('/materials/:id/free-toggle', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE materials SET is_free = ? WHERE id = ?').run(existing.is_free ? 0 : 1, existing.id);
    res.json({ ok: true, isFree: !existing.is_free });
  });

  router.delete('/materials/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM materials WHERE id = ?').run(existing.id);
    fs.promises.unlink(path.join(uploadsDir, existing.stored_name)).catch(() => {});
    res.json({ ok: true });
  });

  router.get('/dashboard', requireAdmin, (req, res) => {
    res.json(dashboardStats(db));
  });
```

Error mapping: multer's `DISALLOWED_EXT` fileFilter error propagates to the central handler added in Task 1 (422). `LIMIT_FILE_SIZE` → 413 handled already. If validation fails after multer wrote the temp file, clean up: add before each 422 return in this route:

```js
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
```

Note: multer errors propagate to error handler; `LIMIT_FILE_SIZE` → 413 handled already. Imports to add at top of `admin.js` for this task: `multer`, `fs`/`path` (node), `dashboardStats` from `../lib/stats.js`.

- [x] **Step 4: Run** `npm test` — PASS (full suite green)
- [x] **Step 5: Commit** `git commit -am "feat(server): material uploads, free gating toggle, dashboard stats"`

---

### Task 11: Frontend foundation — proxy, types, api client, hooks

**Files:**
- Modify: `vite.config.ts` (add dev proxy)
- Create: `src/app/lib/types.ts`, `src/app/lib/api.ts`, `src/app/lib/hooks.ts`

**Interfaces:**
- Produces (consumed by Tasks 12–15):
  - `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put`, `api.patch`, `api.del<T>(path)`, `api.upload<T>(path, formData)`; errors thrown carry `.status` and `.errors?: Record<string,string>`
  - `useApi<T>(path: string | null)` → `{ data: T | null, loading: boolean, error: string | null, refresh: () => void }`
  - Types: `TuitionClass`, `ClassSession`, `Announcement`, `Material`, `Student`, `ContactMessage`, `DashboardStats`, `Paginated<T>`, `AdminUser`

- [x] **Step 1: vite.config.ts** — add:

```ts
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
```

- [x] **Step 2: src/app/lib/types.ts**

```ts
export interface ClassSession { dayOfWeek: number; startTime: string; endTime: string; room: string }
export interface TuitionClass {
  id: number; subject: string; grade: string; medium: string; fee: number;
  description: string; capacity: number; enrolled: number; seatsLeft: number; sessions: ClassSession[];
}
export interface Announcement { id: number; title: string; content: string; type: 'general'|'important'|'warning'|'info'|'new'; tags: string[]; publishedAt: string }
export interface Material { id: number; title: string; subject: string; grade: string; type: 'pdf'|'video'|'image'; sizeBytes: number; isFree: boolean; downloadsCount: number; createdAt: string }
export interface Paginated<T> { data: T[]; total: number; page: number; perPage: number }
export interface Student {
  id: number; fullName: string; preferredGrade: string | null; preferredSubject: string; preferredMedium: string | null;
  studentPhone: string | null; parentName: string | null; parentPhone: string | null; email: string | null; school: string | null;
  status: 'pending'|'active'|'inactive'; enrolledAt: string | null; accessCode: string | null;
  registeredClassId: number | null; classSubject: string | null; classGrade: string | null; createdAt: string;
}
export interface ContactMessage { id: number; name: string; phone: string|null; email: string|null; message: string; readAt: string|null; createdAt: string }
export interface DashboardStats { totalStudents: number; activeStudents: number; classesRunning: number; monthlyRevenue: number; enrollmentByMonth: { month: string; students: number }[] }
export interface AdminUser { id: number; name: string; email: string }
```

- [x] **Step 3: src/app/lib/api.ts**

```ts
const BASE = (import.meta as any).env?.VITE_API_BASE ?? '';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) },
  });
  let payload: any = null;
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    const err: any = new Error(payload?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = payload?.errors;
    throw err;
  }
  return payload as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, form: FormData) => request<T>(p, { method: 'POST', body: form }),
};
```

- [x] **Step 4: src/app/lib/hooks.ts**

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    api.get<T>(path)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refresh };
}
```

- [x] **Step 5: Verify** `npm install && npm run build` at repo root — PASS (files unused yet but must compile). Also boot check: `cd server && node src/index.js` prints listening line; Ctrl+C.
- [x] **Step 6: Commit** `git commit -am "feat(frontend): api client, shared types, useApi hook, dev proxy"`

---

### Task 12: Wire public content pages (Classes, Timetable, Announcements)

**Files:**
- Modify: `src/app/components/ClassesPage.tsx`, `TimetablePage.tsx`, `AnnouncementsPage.tsx`

**Approach (identical pattern ×3): delete the hardcoded const array; call `useApi`; render loading/error minimally; keep all styling/markup/filters unchanged. Exact edits:**

- [x] **Create src/app/lib/format.ts** (shared by Tasks 12–18):

```ts
import type { TuitionClass } from './types';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "Monday & Thursday, 4:00 PM – 8:00 PM" style label from a class's sessions */
export function scheduleLabel(cls: TuitionClass): string {
  if (!cls.sessions.length) return '';
  const days = [...new Set(cls.sessions.map((s) => DAY_NAMES[s.dayOfWeek - 1]))].join(' & ');
  const first = cls.sessions[0];
  const last = cls.sessions[cls.sessions.length - 1];
  return `${days}, ${fmtTime(first.startTime)} – ${fmtTime(last.endTime)}`;
}
```

- [x] **ClassesPage.tsx**
  - Remove `const allClasses = [...]` block entirely; add imports:
    ```tsx
    import { useApi } from "../lib/hooks";
    import { scheduleLabel } from "../lib/format";
    import type { TuitionClass } from "../lib/types";
    ```
  - Inside component: `const { data: allClasses, loading, error } = useApi<TuitionClass[]>("/api/classes");`
  - Guard before grid: `if (loading) return centered <p>"Loading classes…"</p>` styled muted; `if (error) return <p>Could not load classes: {error}</p>`
  - Replace availability math: `cls.seats - cls.enrolled` → `cls.seatsLeft`; pct → `(cls.enrolled / cls.capacity) * 100`; `${cls.enrolled}/${cls.seats} students enrolled` → `${cls.enrolled}/${cls.capacity}`; Clock line text → `{scheduleLabel(cls)}`.
- [x] **TimetablePage.tsx**
  - Delete `schedule` const; fetch:
    ```tsx
    const { data: days, loading, error } = useApi<{ dayOfWeek: number; sessions: { startTime: string; endTime: string; subject: string; grade: string; medium: string; room: string }[] }[]>("/api/timetable");
    const byDay = new Map((days ?? []).map((d) => [d.dayOfWeek, d.sessions]));
    ```
  - Renders use `byDay.get(index + 1) ?? []` where `index` is the position in the existing `days` name array (Monday-first).
  - Time text via `fmtTime(cls.startTime)` / `fmtTime(cls.endTime)` from lib/format.
- [x] **AnnouncementsPage.tsx**
  - Remove `announcements` const; `useApi<Announcement[]>("/api/announcements")`; type key maps identically (`typeConfig[ann.type]`); date: `new Date(ann.publishedAt)`.

**Verification:** `npm run build` PASS; manual: run server (`cd server && node src/index.js` after `npm run seed`) + `npm run dev`; pages show seeded data.

- [x] **Commit** `git commit -am "feat(frontend): wire classes/timetable/announcements to API"`

---

### Task 13: Wire Materials page (download + unlock) and Home featured classes

**Files:**
- Modify: `src/app/components/MaterialsPage.tsx`, `HomePage.tsx`

- [x] **MaterialsPage.tsx**
  - Replace `materials` const with `useApi<Material[]>("/api/materials")`; keep existing client-side filters operating on `materials ?? []`.
  - Size display: `import { humanSize } from "../lib/format"`; replace `{mat.size}` → `{humanSize(mat.sizeBytes)}` (video duration text disappears — acceptable).
  - Download/Members button becomes:
    ```tsx
    const code = localStorage.getItem('member_access_code') || '';
    const href = `/api/materials/${mat.id}/download${!mat.isFree && code ? `?code=${encodeURIComponent(code)}` : ''}`;
    ```
    Free → `<a href={href}>` styled exactly as current button with Download icon. Members → if `code` present, same `<a href={href}>` with Members label; else opens inline unlock box (state `unlockFor: number|null`): small input + button calling `api.post("/api/materials/unlock", { code })`; on success `localStorage.setItem('member_access_code', code)` and refresh nothing (just close); on failure red error text under input.
- [x] **HomePage.tsx**
  - Replace featuredClasses const with `const { data: classes } = useApi<TuitionClass[]>("/api/classes");` then `const featuredClasses = (classes ?? []).slice(0, 3);`
  - Map card fields: badge omitted; medium → cls.medium; Schedule → `scheduleLabel(cls)`; Monthly Fee → `Rs. ${cls.fee.toLocaleString()}/month`.
  - Stats/testimonials sections untouched (marketing copy).

**Verification:** build PASS; manual: seeded member item downloads only after unlock with a seeded active student's code (copy from DB via admin panel in Task 16, or sqlite query).

- [x] **Commit** `git commit -am "feat(frontend): materials download/unlock and dynamic home classes"`

---

### Task 14: Wire Registration + Contact forms

**Files:**
- Modify: `src/app/components/RegistrationPage.tsx`, `ContactPage.tsx`

- [x] **RegistrationPage.tsx**
  - Add state: `submitting`, `serverErrors: Record<string,string>`, `failed`.
  - `handleSubmit`: preventDefault → setSubmitting → `await api.post("/api/registrations", { ...form, fullName: form.studentName })` (the one field-name difference: form state uses `studentName`, API expects `fullName`) → setSubmitted(true) (unchanged screen) → catch: `setServerErrors(e.errors ?? {})`, `setFailed(true)`; finally setSubmitting(false).
  - Render: under each field show `serverErrors[name] ?? serverErrors[fullNameKey(name)]` in small red text; simpler: check both `serverErrors[field]` and, for the name field, `serverErrors.fullName`. Submit button disabled while submitting, label "Submitting…" when busy.
- [x] **ContactPage.tsx** — same pattern posting `{ name, phone, email, message }`; on success keep existing sent screen.

**Verification:** build PASS; manual: submit both forms against seeded server; rows appear in DB; blank name → field errors visible.

- [x] **Commit** `git commit -am "feat(frontend): registration and contact forms persist via API"`

---

### Task 15: AdminPanel Part A — session auth shell + live dashboard

**Files:**
- Modify: `src/app/components/AdminPanel.tsx`

- [x] Replace `adminPassword` gate: states `checking`, `user: AdminUser|null`; mount effect calls `api.get("/api/admin/me")`; 401 → show login card. Login card gains Email input above Password (same styling); submits both to `api.post("/api/admin/login",{email,password})`; on success setUser; error text from response (401 shows "Invalid email or password"). Logout button → `api.post("/api/admin/logout")` then setUser(null).
  - While `checking`, render centered spinner text "Checking session…".
- [x] Dashboard tab: `useApi<DashboardStats>("/api/admin/dashboard")` (only when authenticated); stat cards bind: Total Students→totalStudents, Active→activeStudents, Classes Running→classesRunning, Monthly Revenue→`Rs. ${stats.monthlyRevenue.toLocaleString()}`; chart `data={stats.enrollmentByMonth}`.
- [x] Keep tabs array; add `{ id: "messages", label: "Messages", icon: Mail }` (import Mail from lucide-react) — content rendered in Task 18; for now `activeTab === "messages"` shows `<p>Coming in next step</p>` placeholder removed by Task 18.

**Verification:** build PASS; manual: login with seeded admin (`admin@aravinda...` / `admin123`), refresh keeps session (cookie), logout returns to login.

- [x] **Commit** `git commit -am "feat(frontend): real admin session auth and live dashboard"`

---

### Task 16: AdminPanel Part B — Students management

**Files:**
- Modify: `src/app/components/AdminPanel.tsx`

- [x] Students tab replaces `initialStudents` mock:
  - State: `statusFilter: 'all'|'pending'|'active'|'inactive'`, `search`, path memo: `` `/api/admin/students?${qs}` `` with `useApi<Paginated<Student>>`.
  - Filter chip row (All/Pending/Active/Inactive) styled like ClassesPage chips; search input beside Add Student.
  - Table columns adapt: Name, Grade (preferredGrade), Subject (preferredSubject), Phone (studentPhone), Enrolled (enrolledAt), Status chip, Actions: Approve (only pending; Check icon → PATCH status active), Edit (Pencil → opens form prefilled → PUT), Delete (Trash → confirm() → DELETE), Code copy button (active only; copies accessCode).
  - Add/Edit form (same panel UI): fields Name, Phone, Grade select, Subject select (+ Medium select on edit), Status select (add mode), Save → POST or PUT; refresh list.
  - Pending count badge on tab label optional skip (YAGNI).
- [x] Verification: build PASS; manual: approve a pending registration → access code appears/copyable → member unlock on Materials page works with it; revenue stat changes when approving a student assigned via edit to a class.

- [x] **Commit** `git commit -am "feat(frontend): admin students CRUD, approval flow, access-code copy"`

---

### Task 17: AdminPanel Part C — Classes management

**Files:**
- Modify: `src/app/components/AdminPanel.tsx`

- [x] Classes tab: `useApi<TuitionClass[]>("/api/admin/classes")` — cards render from API (enrolled/capacity bar, fee). Buttons become functional:
  - Add Class button → form panel: Subject/Grade/Medium selects, Fee (number), Capacity (number), Description textarea, isActive switch (default on), Schedule rows (day select Mon–Sun, start/end `type="time"`, room text, remove-row X, "+ Add slot"), Save → `api.post("/api/admin/classes", {..., sessions})`.
  - Edit (pencil) → same form prefilled → `api.put("/api/admin/classes/" + id, formPayload)` then refresh.
  - Delete (trash) → confirm → `api.del` → refresh.
- [x] Verification: build PASS; manual: create class with 2 slots → appears on public Classes + Timetable pages immediately.

- [x] **Commit** `git commit -am "feat(frontend): admin classes CRUD with schedule editor"`

---

### Task 18: AdminPanel Part D — Announcements, Materials, Messages tabs

**Files:**
- Modify: `src/app/components/AdminPanel.tsx`

- [x] Announcements tab: publish form (Title, Content, Type select General/Important/Warning/Info/New mapping to enum values, Publish button) → POST → clears + prepends via refresh; below: list cards (type chip color reuse public palette, date, delete button). 
- [x] Materials tab: upload form wired — Title, Subject/Grade/Type selects, Free-access checkbox, file input (store File in state) → on Upload: FormData via `api.upload("/api/admin/materials", fd)`; list from `useApi<Material[]>("/api/admin/materials")` rows with: title/meta (humanSize util), Free/Members pill (click → PATCH free-toggle), downloads count, Download link, Delete (confirm → DELETE).
- [x] Messages tab (replaces Task 15 placeholder): `useApi<ContactMessage[]>("/api/admin/messages")`; rows: name/contact, message, date; unread bold with dot; actions Mark read (PATCH), Delete. Unread count shown in sidebar tab label.
- [x] Verification: build PASS; manual E2E: submit contact from public site → appears unread in admin → mark read → delete.

- [x] **Commit** `git commit -am "feat(frontend): wire announcements publishing, material uploads, contact inbox"`

---

### Task 19: Production serving, env docs, final end-to-end pass

**Files:**
- Modify: `server/src/index.js` (verify static block correct), `.gitignore`, README.md
- Create: `.env.example` (root), `server/.env.example`

- [x] Root `.env.example`:
```
VITE_API_BASE=
```
- [x] `server/.env.example`:
```
PORT=3000
SESSION_SECRET=
ADMIN_EMAIL=admin@aravindatuition.lk
ADMIN_PASSWORD=change-me-before-deploy
DATA_DIR=
DB_PATH=
```
- [x] README.md — append "## Running the full stack" section:
```markdown
## Running the full stack

Backend API (first time):
    cd server
    npm install
    npm run seed     # creates demo data + admin account (admin@aravindatuition.lk / admin123)

Run backend:
    npm run dev      # http://localhost:3000

Frontend (repo root):
    npm install
    npm run dev      # proxies /api to localhost:3000

Production:
    npm run build            # builds frontend to dist/
    cd server && npm start   # serves API + dist on one port
```
- [x] Fresh-machine simulation: delete `server/data/*` and `server/uploads/*`, reinstall server deps, then full sequence (two terminals): terminal A `cd server && npm i && npm run seed && npm start`; terminal B at repo root `npm run build && npm run dev` → checklist:
  - `curl localhost:3000/api/health` → `{"ok":true}`
  - `curl "localhost:3000/api/classes"` → 6 items
  - POST registration via UI → admin approve → code → unlock → member download 200
  - Admin: create announcement → visible publicly; upload PDF → download counts; message flow
  - `Ctrl+C` everything; stop background server.
- [x] Full backend suite one more time: `cd server && npm test` — ALL PASS
- [x] Commit: `git commit -am "chore: production serving, env examples, docs"`

---

## Self-Review Notes (already applied)

- Spec §4 students gained `preferred_grade` column (needed by admin Add form + tables) — reflected in Task 1 DDL, Task 2 seeder, Task 7 mapper/endpoints, Task 11 types.
- Timetable/classes/materials public responses normalized to camelCase (Global Constraint) — Task 3/Task 4 SELECTs alias snake→camel; tests assert camel keys.
- Task 15 adds a Messages tab placeholder that Task 18 replaces — intentional sequencing.
- No placeholders remain: every backend file has complete code; frontend tasks give exact replacement patterns and shared utils (`format.ts`).
