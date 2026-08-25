CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_slot
  ON class_sessions(class_id, day_of_week, start_time);
