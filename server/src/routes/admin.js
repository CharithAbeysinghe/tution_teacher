import { Router } from 'express';

export function adminRoutes(db, { uploadsDir, rateLimiting = true } = {}) {
  const router = Router();
  return router;
}
