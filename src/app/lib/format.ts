const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

export function humanSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${SIZE_UNITS[i]}`;
}

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function scheduleLabel(day: number, start: string, end: string): string {
  return `${DAYS[day] ?? ''} ${start}–${end}`;
}
