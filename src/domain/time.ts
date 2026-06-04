import type { ISO } from "./types";

const MS_PER_DAY = 86_400_000;

// General absolute day-delta helper (e.g. meeting-history date spans in the UI).
export function daysBetween(a: ISO, b: ISO): number {
  return Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / MS_PER_DAY);
}

export function daysSince(iso: ISO | null, now: ISO): number {
  if (!iso) return Infinity;
  return Math.round((Date.parse(now) - Date.parse(iso)) / MS_PER_DAY);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const MS_PER_MONTH = MS_PER_DAY * 30.44;

/** Whole months between joinedDate and now, clamped to >= 0. 0 if no date. */
export function tenureMonths(joinedDate: ISO | null | undefined, now: ISO): number {
  if (!joinedDate) return 0;
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(joinedDate)) / MS_PER_MONTH));
}

/** Friendly tenure ("1y 4m" / "5m" / "<1m"). Falls back to legacy months. */
export function tenureLabel(joinedDate: ISO | null | undefined, now: ISO, fallbackMonths = 0): string {
  const m = joinedDate ? tenureMonths(joinedDate, now) : fallbackMonths;
  if (m < 1) return "<1m";
  const y = Math.floor(m / 12);
  const mm = m % 12;
  if (y && mm) return `${y}y ${mm}m`;
  return y ? `${y}y` : `${mm}m`;
}
