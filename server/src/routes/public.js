import { Router } from 'express';

export function publicRoutes(db, { rateLimiting = true } = {}) {
  const router = Router();
  router.get('/health', (req, res) => res.json({ ok: true }));
  return router;
}
