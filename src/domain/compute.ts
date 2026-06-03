import type { AreaKey, AsyncItem, Person, Thread, ActionItem, ActionOwner } from "./types";
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

export function raiseScore(t: Thread, now: string): number {
  const staleness = Math.min(daysSince(t.lastTouched, now), 60);
  return t.priority * 0.7 + staleness * 0.5 + (t.raise ? 20 : 0) + (t.status === "parked" ? -25 : 0);
}

export function raiseQueue(p: Person, now: string): Thread[] {
  return [...p.threads].sort((a, b) => raiseScore(b, now) - raiseScore(a, now));
}

export function openActions(items: ActionItem[]): ActionItem[] {
  return items.filter((a) => a.status === "open")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
export function openActionsByOwner(items: ActionItem[], owner: ActionOwner): ActionItem[] {
  return openActions(items).filter((a) => a.owner === owner);
}

export interface BlindSpot { area: AreaKey; avgDays: number; coldCount: number; }
export function teamBlindSpots(people: Person[]): BlindSpot[] {
  return AREA_KEYS.map((area) => {
    const days = people.map((p) => p.coverage[area]);
    const avgDays = days.reduce((s, n) => s + n, 0) / (people.length || 1);
    const coldCount = days.filter((d) => d > 35).length;
    return { area, avgDays, coldCount };
  }).sort((a, b) => b.avgDays - a.avgDays);
}

// Attention-score weights. overdueMgr/asyncItem/stressed are pinned by the handoff;
// recency/coverageGap/raiseFlag are tuned so recency dominates, coverage gap is a
// slow-burn signal, and a stressed async item is a strong amplifier.
const ATTENTION_W = {
  recency: 1.5, coverageGap: 0.4, raiseFlag: 8, overdueMgr: 14, asyncItem: 6, stressed: 20,
} as const;

export function attentionScore(p: Person, now: string): number {
  // Never-met is the worst recency state: treat as maximally overdue rather than
  // a small multiple of cadence (which would rank it below a long-overdue report).
  const overdueDays = p.lastOneOnOne
    ? Math.max(0, daysSince(p.lastOneOnOne, now) - p.cadenceDays)
    : 90;
  const coverageGap = 100 - coverageScore(p);
  const raiseFlags = p.threads.filter((t) => t.raise).length;
  const overdueMgr = openActionsByOwner(p.actions, "manager")
    .filter((a) => actionAgeTier(daysSince(a.createdAt, now)) === "cold").length;
  const asyncCount = p.asyncAgenda.length;
  const stressed = p.asyncAgenda.some((a) => a.mood === "stressed") ? ATTENTION_W.stressed : 0;
  return overdueDays * ATTENTION_W.recency + coverageGap * ATTENTION_W.coverageGap + raiseFlags * ATTENTION_W.raiseFlag + overdueMgr * ATTENTION_W.overdueMgr + asyncCount * ATTENTION_W.asyncItem + stressed;
}

export function attentionOrder(people: Person[], now: string): Person[] {
  return [...people].sort((a, b) => attentionScore(b, now) - attentionScore(a, now));
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

export type Lead =
  | { kind: "async"; item: AsyncItem }
  | { kind: "cold-area"; area: AreaKey; days: number }
  | { kind: "thread"; thread: Thread }
  | { kind: "relationship" };

export interface PrepDigest {
  cadence: CadenceStatus;
  lead: Lead;
  raise: Thread[];          // top 0-3
  openMine: ActionItem[];
  openTheirs: ActionItem[];
  async: AsyncItem[];
  coldArea: { area: AreaKey; days: number };
  lastShare: number;
  lastBalance: Balance;
}

export function prepDigest(p: Person, now: string): PrepDigest {
  const raise = raiseQueue(p, now).slice(0, 3);
  const coldKey = bluntestSpot(p);
  const coldDays = p.coverage[coldKey];
  const lastShare = p.talkTrend.findLast((n) => n > 0) ?? 0;

  let lead: Lead;
  const stressed = p.asyncAgenda.find((a) => a.mood === "stressed");
  if (stressed) lead = { kind: "async", item: stressed };
  else if (coldDays > 35) lead = { kind: "cold-area", area: coldKey, days: coldDays };
  else if (raise.length) lead = { kind: "thread", thread: raise[0] };
  else lead = { kind: "relationship" };

  return {
    cadence: cadenceStatus(p, now),
    lead, raise,
    openMine: openActionsByOwner(p.actions, "manager"),
    openTheirs: openActionsByOwner(p.actions, "report"),
    async: p.asyncAgenda,
    coldArea: { area: coldKey, days: coldDays },
    lastShare,
    lastBalance: balanceHealth(lastShare),
  };
}
