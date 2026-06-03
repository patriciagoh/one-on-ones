import { describe, it, expect } from "vitest";
import {
  stalenessTier, actionAgeTier, balanceHealth,
  coverageScore, bluntestSpot, cadenceStatus,
  raiseScore, raiseQueue,
  openActions, openActionsByOwner, teamBlindSpots, attentionScore, attentionOrder,
} from "./compute";
import type { Person, Thread, ActionItem } from "./types";

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

function thread(t: Partial<Thread>): Thread {
  return { id: "t", title: "", area: "growth", status: "open", priority: 0,
           lastTouched: "2026-06-04", note: "", raise: false, ...t };
}

describe("raiseQueue", () => {
  const now = "2026-06-04";
  it("scores priority*0.7 + min(staleness,60)*0.5 + raise(20) + parked(-25)", () => {
    // priority=100, lastTouched=now → staleness=0, score = 70
    expect(raiseScore(thread({ priority: 100, lastTouched: now }), now)).toBeCloseTo(70);
    // priority=0, lastTouched="2026-05-25" (10 days before now), raise=true
    // staleness = min(10,60) = 10; score = 0*0.7 + 10*0.5 + 20 = 25
    // NOTE: plan comment "9 days → ~4.5" was incorrect; May 25→Jun 4 = 10 days → 25
    expect(raiseScore(thread({ priority: 0, lastTouched: "2026-05-25", raise: true }), now))
      .toBeCloseTo(25);
  });
  it("orders by score desc; parked penalized; staleness capped at 60", () => {
    const a = thread({ id: "a", priority: 80, lastTouched: now });               // 56
    const b = thread({ id: "b", priority: 80, lastTouched: now, raise: true });  // 76
    const c = thread({ id: "c", priority: 80, lastTouched: now, status: "parked" }); // 31
    const ordered = raiseQueue(person({ threads: [a, c, b] }), now).map((t) => t.id);
    expect(ordered).toEqual(["b", "a", "c"]);
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

function action(a: Partial<ActionItem>): ActionItem {
  return { id: "a", text: "", owner: "manager", status: "open", createdAt: "2026-06-01", ...a };
}

describe("actions", () => {
  it("openActions returns open items oldest-first", () => {
    const items = [action({ id: "new", createdAt: "2026-06-03" }),
                   action({ id: "old", createdAt: "2026-05-01" }),
                   action({ id: "done", status: "done" })];
    expect(openActions(items).map((a) => a.id)).toEqual(["old", "new"]);
  });
  it("openActionsByOwner filters owner", () => {
    const items = [action({ id: "m", owner: "manager" }), action({ id: "r", owner: "report" })];
    expect(openActionsByOwner(items, "report").map((a) => a.id)).toEqual(["r"]);
  });
});

describe("teamBlindSpots", () => {
  it("ranks areas by team-average staleness with a cold count", () => {
    const p1 = person({ coverage: { ...baseCoverage, relationships: 50 } });
    const p2 = person({ coverage: { ...baseCoverage, relationships: 40 } });
    const top = teamBlindSpots([p1, p2])[0];
    expect(top.area).toBe("relationships");
    expect(top.coldCount).toBe(2); // both >35
  });
});

describe("attention", () => {
  it("a stressed async item and overdue manager actions raise the score", () => {
    const calm = person({ id: "calm", lastOneOnOne: "2026-06-03", cadenceDays: 7 });
    const hot = person({ id: "hot", lastOneOnOne: "2026-06-03", cadenceDays: 7,
      asyncAgenda: [{ id: "z", text: "", area: "growth", mood: "stressed", addedAt: "2026-06-02" }],
      actions: [action({ createdAt: "2026-05-01" })] }); // >21d overdue manager action
    expect(attentionScore(hot, "2026-06-04")).toBeGreaterThan(attentionScore(calm, "2026-06-04"));
    expect(attentionOrder([calm, hot], "2026-06-04").map((p) => p.id)).toEqual(["hot", "calm"]);
  });
});
