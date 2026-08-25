import type { TuitionClass } from './types';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

export function humanSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${SIZE_UNITS[i]}`;
}

export function scheduleLabel(cls: TuitionClass): string {
  if (!cls.sessions.length) return '';
  const days = [...new Set(cls.sessions.map((s) => DAY_NAMES[s.dayOfWeek - 1]))].join(' & ');
  const first = cls.sessions[0];
  const last = cls.sessions[cls.sessions.length - 1];
  return `${days}, ${fmtTime(first.startTime)} – ${fmtTime(last.endTime)}`;
}
