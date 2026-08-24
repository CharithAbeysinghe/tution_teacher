import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { runMigrations } from './migrate.js';

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

    // --- students (AdminPanel mock; preferred_medium matches the corresponding seeded class) ---
    const newCode = () => 'AC' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const insStudent = db.prepare(`INSERT INTO students
      (full_name, preferred_grade, preferred_subject, preferred_medium, student_phone, status, enrolled_at, access_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const students = [
      ['Dilnoza Perera', 'Grade 11', 'Mathematics', 'English', '071 234 5678', 'active', '2024-09-01'],
      ['Kavindra Silva', 'Grade 9', 'Science', 'Sinhala', '077 345 6789', 'active', '2024-09-05'],
      ['Amali Fernando', 'Grade 10', 'Mathematics', 'Sinhala', '076 456 7890', 'active', '2024-09-10'],
      ['Nimal Jayawardena', 'Grade 7', 'English', 'English', '075 567 8901', 'inactive', null],
      ['Sithum Rathnayake', 'Grade 11', 'Mathematics', 'English', '071 678 9012', 'active', '2024-09-15'],
    ];
    for (const [name, grade, subject, medium, phone, status, enrolledAt] of students) {
      insStudent.run(name, grade, subject, medium, phone, status, enrolledAt, status === 'active' ? newCode() : null);
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
