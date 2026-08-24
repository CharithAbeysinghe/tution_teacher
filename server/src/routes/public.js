import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import rateLimit from 'express-rate-limit';

const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
const SUBJECTS = ['Mathematics', 'Science', 'English'];

export function publicRoutes(db, { rateLimiting = true, uploadsDir } = {}) {
  const router = Router();

  const mkLimiter = (windowMs, max) => rateLimiting ? rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }) : (req, res, next) => next();
  const unlockLimiter = mkLimiter(15 * 60 * 1000, 20);
  const intakeLimiter = mkLimiter(60 * 60 * 1000, 10);   // used by Task 5

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

  return router;
}
