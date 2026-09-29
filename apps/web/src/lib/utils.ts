import { clsx, type ClassValue } from 'clsx';
import { formatDistanceToNowStrict } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 45_000) return 'just now';
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
};

export const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(iso));

const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const compact = (n: number) => compactFormatter.format(n);

export const formatHours = (hours: number | null) => {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^[a-z]/i.test(part))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';

export const pluralize = (n: number, word: string, plural = `${word}s`) =>
  `${n.toLocaleString()} ${n === 1 ? word : plural}`;

/** Removes undefined/empty values so they don't end up in query strings. */
export const cleanParams = (params: Record<string, unknown>) => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else {
      out[key] = String(value);
    }
  }
  return out;
};

/** Only allows same-origin relative redirects (prevents open redirects via ?next=). */
export const safeNext = (next: string | null) =>
  next && /^\/(?![/\\])/.test(next) ? next : '/issues';
