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
