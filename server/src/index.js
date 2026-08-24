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
