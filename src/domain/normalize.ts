import type { AppData, AreaKey } from "./types";
import { AREA_KEYS } from "./types";

/**
 * Defensive sanitizer applied when data is loaded from any store. Guarantees
 * every person has all six coverage keys and a cadenceDays >= 1, so the pure
 * compute functions never divide by zero or hit undefined coverage. Pure:
 * returns a new object graph, does not mutate the input.
 */
export function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    people: data.people.map((p) => {
      const coverage = {} as Record<AreaKey, number>;
      for (const k of AREA_KEYS) {
        const v = p.coverage?.[k];
        coverage[k] = typeof v === "number" && Number.isFinite(v) ? v : 0;
      }
      return {
        ...p,
        coverage,
        cadenceDays: p.cadenceDays >= 1 ? p.cadenceDays : 1,
        seniority: p.seniority ?? "",
        team: p.team ?? "",
        location: p.location ?? "",
        timezone: p.timezone ?? "",
        onCall: p.onCall ?? false,
        joinedDate: p.joinedDate ?? null,
      };
    }),
  };
}
