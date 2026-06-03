import { describe, it, expect } from "vitest";
import {
  stalenessTier, actionAgeTier, balanceHealth,
  coverageScore, bluntestSpot, cadenceStatus,
} from "./compute";
import type { Person } from "./types";

const baseCoverage = { growth: 0, feedback: 0, workload: 0, wellbeing: 0, relationships: 0, recognition: 0 };
function person(p: Partial<Person>): Person {
  return {
    id: "x", name: "X", role: "", pronouns: "", initials: "X", hue: 0, tenureMonths: 1,
    cadenceDays: 7, lastOneOnOne: null, nextScheduled: null,
    talkTrend: [], sentimentTrend: [], coverage: { ...baseCoverage },
    threads: [], actions: [], asyncAgenda: [], meetings: [], ...p,
  };
}

describe("stalenessTier", () => {
  it("bands days into fresh/warming/stale/cold", () => {
    expect(stalenessTier(0)).toBe("fresh");
    expect(stalenessTier(10)).toBe("fresh");
    expect(stalenessTier(11)).toBe("warming");
    expect(stalenessTier(21)).toBe("warming");
    expect(stalenessTier(22)).toBe("stale");
    expect(stalenessTier(35)).toBe("stale");
    expect(stalenessTier(36)).toBe("cold");
    expect(stalenessTier(Infinity)).toBe("cold");
  });
});

describe("actionAgeTier", () => {
  it("bands action age", () => {
    expect(actionAgeTier(0)).toBe("fresh");
    expect(actionAgeTier(7)).toBe("fresh");
    expect(actionAgeTier(8)).toBe("warming");
    expect(actionAgeTier(21)).toBe("warming");
    expect(actionAgeTier(22)).toBe("cold");
  });
});

describe("coverageScore", () => {
  it("is 100 when every area is fresh today", () => {
    expect(coverageScore(person({}))).toBe(100);
  });
  it("is 0 when every area is >=45d stale", () => {
    const cov = { growth: 45, feedback: 50, workload: 60, wellbeing: 45, relationships: 90, recognition: 45 };
    expect(coverageScore(person({ coverage: cov }))).toBe(0);
  });
});

describe("bluntestSpot", () => {
  it("returns the most-stale area", () => {
    const cov = { ...baseCoverage, relationships: 47, growth: 12 };
    expect(bluntestSpot(person({ coverage: cov }))).toBe("relationships");
  });
});

describe("cadenceStatus", () => {
  it("ontrack within cadence", () => {
    expect(cadenceStatus(person({ cadenceDays: 7, lastOneOnOne: "2026-06-01" }), "2026-06-04")).toBe("ontrack");
  });
  it("cold when never met", () => {
    expect(cadenceStatus(person({ lastOneOnOne: null }), "2026-06-04")).toBe("cold");
  });
  // "2026-05-21" is 14 days before "2026-06-04" → ratio 14/7 = 2.0 → stale band (>1.5, ≤2.5)
  // NOTE: plan had "2026-05-15" (20 days → ratio 2.86 → "cold"), which is inconsistent.
  it("stale past 1.5x cadence", () => {
    expect(cadenceStatus(person({ cadenceDays: 7, lastOneOnOne: "2026-05-21" }), "2026-06-04")).toBe("stale");
  });
});

describe("balanceHealth", () => {
  it("0 share is no-data", () => {
    expect(balanceHealth(0)).toEqual({ tier: "none", label: "No data" });
  });
  it("bands the report's airtime share", () => {
    expect(balanceHealth(22)).toEqual({ tier: "bad", label: "You're driving" });
    expect(balanceHealth(39)).toEqual({ tier: "bad", label: "You're driving" });
    expect(balanceHealth(40)).toEqual({ tier: "warn", label: "Manager-heavy" });
    expect(balanceHealth(54)).toEqual({ tier: "warn", label: "Manager-heavy" });
    expect(balanceHealth(55)).toEqual({ tier: "good", label: "Report-led" });
    expect(balanceHealth(78)).toEqual({ tier: "good", label: "Report-led" });
    expect(balanceHealth(79)).toEqual({ tier: "warn", label: "Hands-off" });
  });
});
