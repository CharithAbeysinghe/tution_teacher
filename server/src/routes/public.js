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
