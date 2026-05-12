// Format helpers for durations, counts, dates. All metadata is mono.

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '—:—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPreviewTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}K`.replace('.0K', 'K');
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.0M', 'M');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function formatDateline(d: Date = new Date()): string {
  const day = DAYS[d.getDay()];
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = pad2(d.getFullYear() % 100);
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${day} ${dd}.${mm}.${yy} / ${hh}:${min}`;
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}
