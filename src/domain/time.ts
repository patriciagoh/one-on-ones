import type { ISO } from "./types";

const MS_PER_DAY = 86_400_000;

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
