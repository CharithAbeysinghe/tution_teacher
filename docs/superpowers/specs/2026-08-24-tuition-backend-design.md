# Tuition Teacher — Full-Stack Backend Design

Date: 2026-08-24
Status: Approved by user in chat session

## 1. Overview

The repo is a Figma-exported React 18 + Vite 6 + TypeScript SPA ("Mr. Aravinda's Tuition
Classes", Colombo) with all data hardcoded and a client-side fake admin login. This design
adds an Express + SQLite backend so the site becomes fully functional: public content APIs,
registration/contact intake, admin authentication, CRUD management, gated material
downloads, and real dashboard stats. The existing frontend is wired to the API without any
visual redesign.

## 2. Decisions (user-approved)

| Decision | Choice |
|---|---|
| Backend stack | Node.js, Express, plain ESM JavaScript (no build step) |
| Database | SQLite via `better-sqlite3` (file: `server/data/app.db`, gitignored) |
| Validation | `zod` schemas per route |
| Auth | Single admin; signed-cookie session (`cookie-session`), SameSite=Lax; bcrypt password |
| Revenue stat | Computed: SUM(fee) over active students' assigned classes |
| Member gating | Per-student access code, entered once, stored in localStorage, sent as `?code=` on member downloads |
| Waitlist | Not built; full-class button stays disabled |
| Hosting target | Local dev now; single-process deploy on own VPS later |

## 3. Repository layout after implementation

```
server/
  package.json             # separate deps from frontend root package.json
  src/index.js             # bootstrap; serves ../dist statically in production
  src/db.js                # better-sqlite3 connection (WAL, foreign_keys ON)
  src/migrate.js           # runs ordered SQL migrations from src/migrations/
  src/seed.js              # seeds mock data currently in the UI + admin user
  src/migrations/*.sql
  src/routes/public.js     # public endpoints
  src/routes/admin.js      # authenticated endpoints
  src/middleware/auth.js   # requireAdmin
  src/middleware/validate.js
  src/lib/stats.js         # dashboard aggregation queries
  src/lib/access-codes.js  # code generation/validation
  uploads/materials/       # uploaded files (gitignored)
  data/app.db              # sqlite file (gitignored)
src/app/lib/api.ts         # typed fetch wrapper (frontend)
src/app/lib/types.ts       # shared TS types matching API payloads
```

Dev proxying: Vite dev server proxies `/api` → `http://localhost:3000` (material files
are never served statically — they stream through the gated download route).
Production: Express serves the built frontend `dist/` — one process.

## 4. Database schema (SQLite)

```sql
users (
  id INTEGER PK AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)

classes (
  id INTEGER PK AUTOINCREMENT,
  subject TEXT NOT NULL CHECK (subject IN ('Mathematics','Science','English')),
  grade TEXT NOT NULL CHECK (grade IN ('Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11')),
  medium TEXT NOT NULL CHECK (medium IN ('Sinhala','English')),
  fee REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at / updated_at TEXT
)

class_sessions (
  id INTEGER PK AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- ISO: 1=Mon .. 7=Sun
  start_time TEXT NOT NULL,   -- 'HH:MM'
  end_time TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT ''
)

students (
  id INTEGER PK AUTOINCREMENT,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  school TEXT,
  parent_name TEXT,                  -- nullable: admin direct-add has no parent data
  parent_phone TEXT,                 -- public registration validation enforces presence
  student_phone TEXT,
  email TEXT,
  address TEXT,
  preferred_grade TEXT NOT NULL DEFAULT 'Grade 6',
  preferred_subject TEXT NOT NULL,
  preferred_medium TEXT NOT NULL,
  previous_results TEXT,
  source TEXT,                       -- "How did you hear about us"
  status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','active','inactive')),
  enrolled_at TEXT,                  -- set when status becomes active
  access_code TEXT UNIQUE,           -- generated on activation
  registered_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  created_at / updated_at TEXT
)

announcements (
  id INTEGER PK AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general'
      CHECK (type IN ('general','important','warning','info','new')),
  tags TEXT NOT NULL DEFAULT '[]',   -- JSON array string
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at / updated_at TEXT
)

materials (
  id INTEGER PK AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('Mathematics','Science','English')),
  grade TEXT NOT NULL CHECK (grade IN ('Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11')),
  type TEXT NOT NULL CHECK (type IN ('pdf','video','image')),
  stored_name TEXT NOT NULL,         -- filename on disk under uploads/materials/
  original_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at / updated_at TEXT
)

contact_messages (
  id INTEGER PK AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Notes:
- Public registration creates `students.status='pending'`. Admin approval sets
  `status='active'`, `enrolled_at=now`, generates unique `access_code`.
- Admin can also add students directly (active by default), matching the existing UI.
- Timetable = join of `classes` × `class_sessions` for active classes.
- `seats_left` = capacity − COUNT(students WHERE registered_class_id=class.id AND status='active').

## 5. API endpoints

Conventions: base path `/api`; JSON bodies; **JSON payloads use camelCase keys**
(matching the existing React form field names); SQLite columns stay snake_case with
explicit mapping in insert/update code; errors as `{ error: string }` (4xx/5xx) or
`{ errors: { field: message } }` (422 validation). All list endpoints return arrays or
`{ data, total, page, per_page }` when paginated (admin students only).

### Public

| Method & path | Notes |
|---|---|
| GET `/api/classes?grade=&subject=` | active only; includes `sessions[]`, `enrolled`, `seats_left` |
| GET `/api/timetable` | grouped `{ day_of_week, sessions[] }` Mon–Sun, ordered |
| GET `/api/announcements` | ordered by published_at DESC |
| GET `/api/materials?search=&subject=&grade=&free_only=true` | metadata incl. `downloads_count`; no file paths; `search` matches title (LIKE) or subject |
| POST `/api/materials/unlock` `{ code }` | 200 `{ ok:true, studentName }` if code belongs to an active student |
| GET `/api/materials/:id/download?code=` | free → streams file, counts download. Non-free → requires valid active-student code, else 403 |
| POST `/api/registrations` | public form; throttled (e.g. 10/hour/IP); 201 `{ id }` |
| POST `/api/contact-messages` | throttled (e.g. 10/hour/IP); 201 `{ id }` |

Registration required fields: full_name, grade, school, parent_name, parent_phone,
subject, medium (+ optional dob, student_phone, email, address, previous_results,
how_did_you_hear). Phone format loose-checked (`^[0-9+\-\s]{7,15}$`).

### Admin (all under `/api/admin/*`, guarded by requireAdmin except login)

| Method & path | Notes |
|---|---|
| POST `/api/admin/login` `{ email, password }` | sets session cookie; rate-limited |
| POST `/api/admin/logout` | clears cookie |
| GET `/api/admin/me` | current admin name/email |
| GET `/api/admin/students?status=&search=&page=1&per_page=20` | paginated; search on name/phone |
| POST `/api/admin/students` | direct creation (defaults active, enrolled today) |
| PUT `/api/admin/students/:id` | edit fields incl. class assignment |
| PATCH `/api/admin/students/:id/status` `{ status }` | approve/reject/deactivate; activation mints access code if the student has none |
| DELETE `/api/admin/students/:id` | hard delete |
| GET `/api/admin/classes` | all classes w/ sessions + enrolled count |
| POST `/api/admin/classes` | body includes `sessions[]` |
| PUT `/api/admin/classes/:id` | replaces sessions atomically |
| DELETE `/api/admin/classes/:id` | cascade sessions; students unassigned (SET NULL) |
| GET `/api/admin/announcements` | all fields |
| POST `/api/admin/announcements` | `{ title, content, type, tags[] }` |
| PUT `/api/admin/announcements/:id` / DELETE | standard |
| GET `/api/admin/materials` | incl. original_name, size, downloads |
| POST `/api/admin/materials` | multipart: file + title/subject/grade/type/is_free; max 50 MB; ext allow-list pdf/mp4/jpg/png/webp/gif |
| PATCH `/api/admin/materials/:id/free-toggle` | flip is_free |
| DELETE `/api/admin/materials/:id` | removes DB row + disk file |
| GET `/api/admin/messages?unread_only=` | inbox |
| PATCH `/api/admin/messages/:id/read` | sets read_at |
| DELETE `/api/admin/messages/:id` | delete |
| GET `/api/admin/dashboard` | `{ total_students, active_students, classes_running, monthly_revenue, enrollment_by_month: [{ month:'Jul', students }] }` |

Dashboard semantics:
- `total_students` — all rows; `active_students` — status='active'
- `classes_running` — COUNT(classes WHERE is_active=1)
- `monthly_revenue` — SUM(class.fee) over active students' assigned classes
- `enrollment_by_month` — COUNT(students) by created_at month, last 6 calendar months

## 6. Authentication & security

- Seed admin from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) with sane dev defaults; bcrypt hash.
- Session: `cookie-session` signed cookie, `SameSite=Lax`, httpOnly, 7-day maxAge,
  secret from env `SESSION_SECRET` (random fallback generated once into `server/data/`
  if unset — dev convenience only).
- `requireAdmin` middleware returns 401 JSON when absent.
- CORS: not needed same-origin in prod; dev uses Vite proxy so no CORS config required.
  If ever split-hosted, add `cors` restricted to the frontend origin.
- Rate limiting: login 5 per 15 min/IP; registrations 10/hour/IP; contact messages
  10/hour/IP; material unlock 20 per 15 min/IP.
- Uploads: extension + size checks; files never executable-served (stored outside static
  root, streamed via route with proper Content-Type + Content-Disposition).

## 7. Frontend changes (wiring only, no visual redesign)

1. `src/app/lib/types.ts` — TS interfaces mirroring §4/§5 payloads.
2. `src/app/lib/api.ts` — small fetch wrapper (`getJSON/postJSON/...`) with base URL from
   `import.meta.env.VITE_API_BASE ?? ''`, JSON error normalization.
3. Data hooks (`useApi<T>(path)` returning `{ data, loading, error, refresh }`).
4. Pages:
   - ClassesPage/TimetablePage/AnnouncementsPage/MaterialsPage/HomePage(featured):
     replace hardcoded arrays with fetched data + minimal loading/error text.
     Client-side filters remain (datasets are small).
   - RegistrationPage: submit → POST; disable while sending; map 422 errors to fields;
     success screen unchanged.
   - ContactPage: same pattern.
   - MaterialsPage: Download button → `<a href=/api/materials/{id}/download>` (with
     `?code=` from localStorage when present); Members button prompts inline unlock input
     → POST unlock → store code in localStorage (`member_access_code`).
5. AdminPanel:
   - Login form → POST login; on success load dashboard; logout clears.
   - Students tab: fetch paginated list; Add wired; Delete wired; Edit implemented;
     Approve action for pending registrations; access code shown/copyable.
   - Classes tab: cards from API; Edit/Delete functional; Add Class form (fields +
     repeatable schedule row: day/start/end/room).
   - Announcements tab: publish form wired; list with delete.
   - Materials tab: upload form wired (FormData); list with free-toggle + delete.
   - Dashboard: stats + chart from API.
6. `.env.example`: `VITE_API_BASE`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `PORT`.

## 8. Testing strategy

Backend tests use Node's built-in `node:test` runner + global `fetch` against the app
listening on an ephemeral port, with a fresh temp SQLite database per run (no supertest
dependency needed):

- migrations/seed idempotency smoke test
- public endpoints: shape, filters, timetable grouping
- registration + contact validation failures and success persistence
- auth: login wrong/right credentials, guarded routes 401, logout
- students lifecycle: create direct, register→approve mints access code, revenue reflects fees
- classes CRUD with sessions replacement
- announcements CRUD
- materials upload (small buffer multipart), free vs gated download, counter increments,
  unlock flow, 403 on bad code
- dashboard numbers match fixtures

Frontend: build must pass (`npm run build`); manual E2E checklist executed at the end
(register flow, admin approve, upload+download, unlock).

## 9. Out of scope (explicitly)

Email notifications, payments tracking table, waitlists, student portal/logins, rich text
editing, image CDN migration, react-router migration, i18n.
