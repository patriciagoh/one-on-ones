import type { AreaKey, Person, Thread, ActionItem, ActionOwner } from "./types";
import { AREA_KEYS } from "./types";
import { daysSince, clamp } from "./time";

export type StalenessTier = "fresh" | "warming" | "stale" | "cold";
export function stalenessTier(days: number): StalenessTier {
  if (days <= 10) return "fresh";
  if (days <= 21) return "warming";
  if (days <= 35) return "stale";
  return "cold";
}

export type ActionAgeTier = "fresh" | "warming" | "cold";
export function actionAgeTier(days: number): ActionAgeTier {
  if (days <= 7) return "fresh";
  if (days <= 21) return "warming";
  return "cold";
}

export function coverageScore(p: Person): number {
  const per = AREA_KEYS.map((k) => 1 - clamp(p.coverage[k], 0, 45) / 45);
  const avg = per.reduce((s, n) => s + n, 0) / AREA_KEYS.length;
  return Math.round(avg * 100);
}

export function bluntestSpot(p: Person): AreaKey {
  return AREA_KEYS.reduce((worst, k) => (p.coverage[k] > p.coverage[worst] ? k : worst), AREA_KEYS[0]);
}

export type CadenceStatus = "ontrack" | "due" | "stale" | "cold";
export function cadenceStatus(p: Person, now: string): CadenceStatus {
  const d = daysSince(p.lastOneOnOne, now);
  if (d === Infinity) return "cold";
  const ratio = d / p.cadenceDays;
  if (ratio <= 1) return "ontrack";
  if (ratio <= 1.5) return "due";
  if (ratio <= 2.5) return "stale";
  return "cold";
}

export type BalanceTier = "bad" | "warn" | "good" | "none";
export interface Balance { tier: BalanceTier; label: string; }
export function balanceHealth(share: number): Balance {
  if (share <= 0) return { tier: "none", label: "No data" };
  if (share < 40) return { tier: "bad", label: "You're driving" };
  if (share < 55) return { tier: "warn", label: "Manager-heavy" };
  if (share <= 78) return { tier: "good", label: "Report-led" };
  return { tier: "warn", label: "Hands-off" };
}
