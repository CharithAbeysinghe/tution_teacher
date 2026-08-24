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

  return router;
}
