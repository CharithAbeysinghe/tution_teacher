import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export function adminRoutes(db, { uploadsDir, rateLimiting = true } = {}) {
  const router = Router();

  const mkLimiter = (windowMs, max) => rateLimiting ? rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }) : (req, res, next) => next();
  const loginLimiter = mkLimiter(15 * 60 * 1000, 5);

  const revokedSessions = new Set();
  const MAX_REVOKED = 1000;

  function sessionFingerprint(req) {
    const m = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie || '');
    return m ? crypto.createHash('sha256').update(m[1]).digest('hex') : null;
  }

  const authGuard = (req, res, next) => {
    const fp = sessionFingerprint(req);
    if (fp && revokedSessions.has(fp)) {
      req.session = null;
      return res.status(401).json({ error: 'Unauthorized' });
    }
    requireAdmin(req, res, next);
  };

  const loginSchema = z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password required'),
  });

  router.post('/login', loginLimiter, validate(loginSchema), (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.adminId = user.id;
    res.json({ id: user.id, name: user.name, email: user.email });
  });

  router.post('/logout', (req, res) => {
    const fp = sessionFingerprint(req);
    if (fp) {
      revokedSessions.add(fp);
      if (revokedSessions.size > MAX_REVOKED) revokedSessions.delete(revokedSessions.values().next().value);
    }
    req.session = null;
    res.json({ ok: true });
  });

  router.get('/me', authGuard, (req, res) => {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.adminId);
    if (!user) { req.session = null; return res.status(401).json({ error: 'Unauthorized' }); }
    res.json(user);
  });

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

  router.get('/students', authGuard, (req, res) => {
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
  function mintUniqueAccessCode() {
    for (let i = 0; i < 5; i++) {
      const code = 'AC' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const exists = db.prepare('SELECT 1 FROM students WHERE access_code = ?').get(code);
      if (!exists) return code;
    }
    throw new Error('Failed to generate unique access code after 5 attempts');
  }

  router.post('/students', authGuard, (req, res) => {
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
    const code = b.status === 'active' ? mintUniqueAccessCode() : null;
    const info = db.prepare(`INSERT INTO students (full_name, student_phone, preferred_grade, preferred_subject, preferred_medium, status, enrolled_at, access_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(b.name, b.phone, b.grade, b.subject, b.medium || 'Sinhala', b.status, b.enrolledAt || today, code);
    const row = db.prepare(`${studentSelect} WHERE s.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(mapStudent(row));
  });

  router.put('/students/:id', authGuard, (req, res) => {
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

  router.patch('/students/:id/status', authGuard, (req, res) => {
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
      WHERE id = ?`).run(status, status, today, status, mintUniqueAccessCode(), existing.id);
    res.json(mapStudent(db.prepare(`${studentSelect} WHERE s.id = ?`).get(existing.id)));
  });

  router.delete('/students/:id', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Student not found' });
    res.json({ ok: true });
  });

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

  router.get('/classes', authGuard, (req, res) => {
    res.json(db.prepare('SELECT * FROM classes ORDER BY id').all().map(classRowMapper));
  });

  const insertSessions = db.transaction((classId, sessions) => {
    const st = db.prepare('INSERT INTO class_sessions (class_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)');
    for (const s of sessions) st.run(classId, s.dayOfWeek, s.startTime, s.endTime, s.room || '');
  });

  router.post('/classes', authGuard, (req, res) => {
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

  router.put('/classes/:id', authGuard, (req, res) => {
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

  router.delete('/classes/:id', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true });
  });

  const annSchema = z.object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    type: z.enum(['general', 'important', 'warning', 'info', 'new']).default('general'),
    tags: z.array(z.string().trim().min(1)).max(8).optional().default([]),
  });
  function mapAnnouncement(r) {
    return { id: r.id, title: r.title, content: r.content, type: r.type, tags: JSON.parse(r.tags || '[]'), publishedAt: r.published_at, createdAt: r.created_at };
  }

  router.get('/announcements', authGuard, (req, res) => {
    res.json(db.prepare('SELECT * FROM announcements ORDER BY published_at DESC, id DESC').all().map(mapAnnouncement));
  });
  router.post('/announcements', authGuard, (req, res) => {
    const p = annSchema.safeParse(req.body ?? {});
    if (!p.success) return res.status(422).json({ errors: Object.fromEntries(p.error.issues.map(i => [i.path.join('.'), i.message])) });
    const b = p.data;
    const info = db.prepare('INSERT INTO announcements (title, content, type, tags) VALUES (?, ?, ?, ?)')
      .run(b.title, b.content, b.type, JSON.stringify(b.tags));
    res.status(201).json(mapAnnouncement(db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid)));
  });
  router.put('/announcements/:id', authGuard, (req, res) => {
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
  router.delete('/announcements/:id', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  function mapMessage(r) {
    return { id: r.id, name: r.name, phone: r.phone, email: r.email, message: r.message, readAt: r.read_at, createdAt: r.created_at };
  }
  router.get('/messages', authGuard, (req, res) => {
    const sql = req.query.unreadOnly === '1'
      ? 'SELECT * FROM contact_messages WHERE read_at IS NULL ORDER BY created_at DESC'
      : 'SELECT * FROM contact_messages ORDER BY created_at DESC';
    res.json(db.prepare(sql).all().map(mapMessage));
  });
  router.patch('/messages/:id/read', authGuard, (req, res) => {
    const info = db.prepare(`UPDATE contact_messages SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL`).run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found or already read' });
    res.json({ ok: true });
  });
  router.delete('/messages/:id', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return router;
}
