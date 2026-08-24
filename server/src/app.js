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
