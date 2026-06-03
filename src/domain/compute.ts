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
