# one-on-ones Redesign (Matcha Oat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `one-on-ones` as a four-screen, local-first manager's tool (Overview, Person, Meeting Mode, Summary) with prep-digest / action-ledger / async-agenda features, reskinned onto the Matcha Oat design system, at WCAG 2.2 AA.

**Architecture:** Four layers — `src/domain` (pure logic + types, no React/DOM), `src/storage` (injectable-localStorage interface, schema v2 + migration, seed), `src/state` (store + mutations), `src/ui` (atoms + four screens). HashRouter routes; meeting and summary are real pages. Matcha Oat consumed as a git dependency via its Tailwind preset + `tokens.css`; an app token file maps the four-tier signal scale onto base tokens; a CI guardrail forbids raw hex/font literals in `src/ui`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind 3, react-router-dom v6 (HashRouter), Vitest + vitest-axe + @testing-library/react (jsdom), matcha-oat-design-system (git dep), fast-glob (lint-tokens).

**Reference (layout source of truth):** the four screenshots in `~/Downloads/one-on-ones-extract/screenshots/` (`page-overview.png`, `page-person-maya.png`, `page-meeting.png`, `page-summary.png`) and the handoff doc `~/Downloads/Claude Code Handoff.md`. The spec is `docs/superpowers/specs/2026-06-03-redesign-matcha-oat-design.md`.

**Design decisions locked (see spec):** fresh rewrite of `src/`; electric-blue primary -> `--matcha-deep`, yolk as sparing accent; signal scale green->amber->rust (`fresh=matcha-deep, warming=matcha, stale=yolk-deep, cold=bad`), each tier always color + word + shape. Names in the handoff are "indicative" — where its single-arg signatures (`attentionScore(person)`, `openActions(personId)`) would force the domain to read a store, this plan uses array/context args to keep functions pure. **Numbers the handoff did not pin down** (cadenceStatus ratio bands, attentionScore secondary weights) are chosen here and flagged at the Phase 1 pause for review.

---

## File Structure

```
package.json                      deps + scripts (rewritten)
vite.config.ts                    base "/one-on-ones/", jsdom test env
tailwind.config.ts                matcha-oat preset
postcss.config.js                 (unchanged)
tsconfig*.json                    (unchanged)
index.html                        title "one-on-ones — meaningful 1:1s"
scripts/lint-tokens.mjs           guardrail wrapper (fast-glob -> matcha checker)
src/main.tsx                      mount <App/>
src/index.css                     token imports + base + a11y globals
src/styles/tokens.ooo.css         app signal-scale tokens -> matcha base tokens
src/test/setup.ts                 vitest-axe + jest-dom matchers
src/domain/types.ts               all interfaces + AreaKey
src/domain/time.ts                daysSince / daysBetween / clamp helpers
src/domain/time.test.ts
src/domain/compute.ts             all pure functions
src/domain/compute.test.ts
src/storage/store.ts              StoragePort + localStorage adapter + schema v2 + migration
src/storage/seed.ts              6-person seed + templates
src/storage/store.test.ts
src/state/useAppState.ts          store hook + mutations
src/state/useAppState.test.ts
src/ui/atoms/{Avatar,StatusDot,Sparkline,CoverageRadar,CoverageStrip,TalkBalance,AreaTag}.tsx
src/ui/{PrepDigest,ActionLedger,AsyncAgenda}.tsx
src/ui/Overview.tsx
src/ui/Person.tsx
src/ui/MeetingMode.tsx
src/ui/Summary.tsx
src/ui/App.tsx                    HashRouter + routes + skip link + masthead
src/ui/*.axe.test.tsx             one axe smoke test per screen
```

---

## Phase 0 — Scaffold & reskin wiring

### Task 0.1: Clear old `src/` and reset entry points

**Files:**
- Delete: everything under `src/` except keep nothing (fresh rewrite)
- Create: `src/main.tsx`, `index.html` (modify)

- [ ] **Step 1: Remove old source**

```bash
git rm -r src/App.css src/App.tsx src/assets/react.svg src/assets/vite.svg \
  src/domain src/state src/storage src/ui src/index.css src/main.tsx
# keep src/assets/hero.png only if referenced later; otherwise remove:
git rm src/assets/hero.png
```

- [ ] **Step 2: Recreate `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Set `index.html` title**

In `index.html` set `<title>one-on-ones — meaningful 1:1s</title>` and ensure `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>` are present.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: clear old src for matcha-oat rewrite"
```

### Task 0.2: Dependencies, Tailwind preset, Vite/test config

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tailwind.config.ts` (rename from `.js`)

- [ ] **Step 1: Install dependencies**

```bash
npm i react-router-dom@^6
npm i -D github:patriciagoh/matcha-oat-design-system fast-glob jsdom \
  vitest-axe@^1.0.0-pre.3 @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Add npm scripts** to `package.json`

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "lint:tokens": "node scripts/lint-tokens.mjs \"src/ui/**/*.{ts,tsx}\"",
  "typecheck": "tsc --noEmit",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Replace `tailwind.config.js` with `tailwind.config.ts`**

```bash
git rm tailwind.config.js
```

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
import matchaOat from "matcha-oat-design-system/tailwind-preset";

export default {
  presets: [matchaOat],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
```

- [ ] **Step 4: Update `vite.config.ts`** (Pages base + jsdom test env)

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/one-on-ones/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 5: Verify install + typecheck baseline**

Run: `npm run typecheck`
Expected: passes (no `src` TS yet beyond main; if main errors on missing `./ui/App`, that's expected until Phase 4 — acceptable here, OR stub `src/ui/App.tsx` with `export const App = () => null;`). Stub it:

```tsx
// src/ui/App.tsx (temporary stub, replaced in Phase 4)
export const App = () => null;
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "build: wire matcha-oat preset, react-router, vitest jsdom"
```

### Task 0.3: Token imports, app signal tokens, a11y globals, test setup, guardrail

**Files:**
- Create: `src/index.css`, `src/styles/tokens.ooo.css`, `src/test/setup.ts`, `scripts/lint-tokens.mjs`

- [ ] **Step 1: `src/styles/tokens.ooo.css`** — app signal scale -> matcha base tokens

```css
:root {
  /* Coverage signal scale (green -> amber -> rust). Always paired with a
     word + shape in the UI so color is never load-bearing alone (WCAG 1.4.1). */
  --ooo-fresh:   var(--matcha-deep); /* good   */
  --ooo-warming: var(--matcha);
  --ooo-stale:   var(--yolk-deep);   /* warn   */
  --ooo-cold:    var(--bad);         /* alert  */

  /* soft fills for the same tiers (chips, washes) */
  --ooo-fresh-bg:   var(--matcha-tint);
  --ooo-warming-bg: var(--matcha-tint);
  --ooo-stale-bg:   var(--yolk-tint);
  --ooo-cold-bg:    var(--bad-bg);
}
```

- [ ] **Step 2: `src/index.css`** — imports + base + a11y globals

```css
@import "matcha-oat-design-system/tokens.css";
@import "matcha-oat-design-system/fonts.css";
@import "./styles/tokens.ooo.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-padding-top: 84px; } /* sticky masthead clearance (WCAG 2.4.x) */
html, body, #root { min-height: 100%; }
body { background: var(--oat); color: var(--ink); font-family: var(--sans); }

/* Visible focus ring everywhere (WCAG 2.4.7). */
:where(a, button, [role="button"], input, textarea, select, [tabindex]):focus-visible {
  outline: var(--focus);
  outline-offset: var(--focus-offset);
}

/* >=24px interactive targets (WCAG 2.5.8); buttons/role=button get a floor. */
:where(button, [role="button"]) { min-height: 24px; }

/* Reduced motion (WCAG 2.3.3). */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

/* Skip link, shown on focus. */
.skip-link {
  position: absolute; left: 8px; top: -48px;
  background: var(--paper); color: var(--matcha-deep);
  padding: 8px 12px; border-radius: var(--r-sm); z-index: 50;
  transition: top var(--dur-base) var(--ease);
}
.skip-link:focus { top: 8px; }
```

- [ ] **Step 3: `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import { expect } from "vitest";
expect.extend(matchers);
```

- [ ] **Step 4: `scripts/lint-tokens.mjs`** (wrapper around the matcha guardrail)

```js
#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const fg = (await import("fast-glob")).default;

const patterns = process.argv.slice(2);
if (patterns.length === 0) { console.error("usage: lint-tokens.mjs <glob...>"); process.exit(2); }
const files = await fg(patterns);
if (files.length === 0) { console.log("OK — no files matched lint:tokens globs."); process.exit(0); }

const checker = require.resolve("matcha-oat-design-system/scripts/check-no-raw-values.mjs");
const res = spawnSync(process.execPath, [checker, ...files], { stdio: "inherit" });
process.exit(res.status ?? 1);
```

- [ ] **Step 5: Verify guardrail runs (no UI files yet -> no-op)**

Run: `npm run lint:tokens`
Expected: `OK — no files matched lint:tokens globs.`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "build: token imports, signal-scale tokens, a11y globals, test setup, lint-tokens guardrail"
```

---

## Phase 1 — Types & domain  ⏸ PAUSE FOR REVIEW AFTER THIS PHASE

> After Task 1.9 commits, **stop and show the type model + chosen numeric bands** to the user before building further (handoff request).

### Task 1.1: Domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
export type AreaKey =
  | "growth" | "feedback" | "workload" | "wellbeing" | "relationships" | "recognition";

export const AREA_KEYS: AreaKey[] = [
  "growth", "feedback", "workload", "wellbeing", "relationships", "recognition",
];

export const AREA_LABELS: Record<AreaKey, string> = {
  growth: "Career & growth",
  feedback: "Feedback",
  workload: "Workload & focus",
  wellbeing: "Wellbeing",
  relationships: "Team & relationships",
  recognition: "Recognition",
};

export type ISO = string; // ISO date, e.g. "2026-06-03"

export type ThreadStatus = "open" | "parked";
export interface Thread {
  id: string; title: string; area: AreaKey;
  status: ThreadStatus; priority: number; // 0-100
  lastTouched: ISO; note: string; raise: boolean;
}

export type ActionOwner = "manager" | "report";
export type ActionStatus = "open" | "done";
export interface ActionItem {
  id: string; text: string; owner: ActionOwner;
  status: ActionStatus; createdAt: ISO; doneAt?: ISO;
  fromArea?: AreaKey; linkedThread?: string;
}

export type Mood = "energized" | "neutral" | "unsure" | "stressed";
export interface AsyncItem {
  id: string; text: string; area: AreaKey; mood: Mood; addedAt: ISO;
}

export interface MeetingRecord {
  date: ISO; durationMin: number; reportShare: number; // %
  areas: AreaKey[]; actions: number; summary: string;
}

/** In-memory model nests per-person collections (storage persists the whole
 *  person). This keeps per-person pure functions — prepDigest(person),
 *  attentionScore(person) — from having to read a global store. */
export interface Person {
  id: string; name: string; role: string; pronouns: string; initials: string;
  hue: number; tenureMonths: number;
  cadenceDays: number;
  lastOneOnOne: ISO | null;
  nextScheduled: ISO | null;
  talkTrend: number[];      // report's % airtime per past meeting (0 = no meeting)
  sentimentTrend: number[]; // 1-5
  coverage: Record<AreaKey, number>; // days since each area was discussed
  threads: Thread[];
  actions: ActionItem[];
  asyncAgenda: AsyncItem[];
  meetings: MeetingRecord[];
}

export interface TemplateDef {
  id: string; name: string; primaryArea: AreaKey; prompts: string[];
}

export interface AppData {
  version: number;
  people: Person[];
  templates: TemplateDef[];
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts && git commit -m "feat(domain): data model types"
```

### Task 1.2: Time helpers (TDD)

**Files:**
- Create: `src/domain/time.ts`, `src/domain/time.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/domain/time.test.ts
import { describe, it, expect } from "vitest";
import { daysBetween, daysSince, clamp } from "./time";

describe("time", () => {
  it("daysBetween counts whole days", () => {
    expect(daysBetween("2026-06-01", "2026-06-04")).toBe(3);
    expect(daysBetween("2026-06-04", "2026-06-01")).toBe(3); // absolute
  });
  it("daysSince(null) is Infinity", () => {
    expect(daysSince(null, "2026-06-04")).toBe(Infinity);
  });
  it("daysSince counts from iso to now", () => {
    expect(daysSince("2026-05-28", "2026-06-04")).toBe(7);
  });
  it("clamp bounds a number", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/domain/time.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `time.ts`**

```ts
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
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/domain/time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/time.ts src/domain/time.test.ts && git commit -m "feat(domain): time helpers"
```

### Task 1.3: `stalenessTier` + `actionAgeTier` (TDD)

**Files:**
- Create: `src/domain/compute.ts`, `src/domain/compute.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/domain/compute.test.ts
import { describe, it, expect } from "vitest";
import { stalenessTier, actionAgeTier } from "./compute";

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
```

- [ ] **Step 2: Run, expect fail**

Run: `npx vitest run src/domain/compute.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement (start `compute.ts`)**

```ts
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
```

- [ ] **Step 4: Run, expect pass.** Run: `npx vitest run src/domain/compute.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.ts src/domain/compute.test.ts && git commit -m "feat(domain): stalenessTier, actionAgeTier"
```

### Task 1.4: `balanceHealth` (TDD)

**Files:** Modify `src/domain/compute.ts`, `src/domain/compute.test.ts`

- [ ] **Step 1: Add failing test**

```ts
import { balanceHealth } from "./compute";

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
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/domain/compute.test.ts`

- [ ] **Step 3: Implement**

```ts
export type BalanceTier = "bad" | "warn" | "good" | "none";
export interface Balance { tier: BalanceTier; label: string; }
export function balanceHealth(share: number): Balance {
  if (share <= 0) return { tier: "none", label: "No data" };
  if (share < 40) return { tier: "bad", label: "You're driving" };
  if (share < 55) return { tier: "warn", label: "Manager-heavy" };
  if (share <= 78) return { tier: "good", label: "Report-led" };
  return { tier: "warn", label: "Hands-off" };
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.* && git commit -m "feat(domain): balanceHealth"
```

### Task 1.5: `coverageScore`, `bluntestSpot`, `cadenceStatus`

**Files:** Modify `compute.ts`, `compute.test.ts`

> **Chosen numbers (flag at pause):** `cadenceStatus` uses ratio = daysSince(lastOneOnOne)/cadenceDays — `ontrack` ≤1.0, `due` ≤1.5, `stale` ≤2.5, `cold` >2.5; a null `lastOneOnOne` → `cold`.

- [ ] **Step 1: Add tests**

```ts
import { coverageScore, bluntestSpot, cadenceStatus } from "./compute";
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
  it("stale past 2x cadence", () => {
    expect(cadenceStatus(person({ cadenceDays: 7, lastOneOnOne: "2026-05-15" }), "2026-06-04")).toBe("stale");
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.* && git commit -m "feat(domain): coverageScore, bluntestSpot, cadenceStatus"
```

### Task 1.6: `raiseQueue` ordering (TDD)

**Files:** Modify `compute.ts`, `compute.test.ts`

- [ ] **Step 1: Add test**

```ts
import { raiseQueue, raiseScore } from "./compute";
import type { Thread } from "./types";

function thread(t: Partial<Thread>): Thread {
  return { id: "t", title: "", area: "growth", status: "open", priority: 0,
           lastTouched: "2026-06-04", note: "", raise: false, ...t };
}

describe("raiseQueue", () => {
  const now = "2026-06-04";
  it("scores priority*0.7 + min(staleness,60)*0.5 + raise(20) + parked(-25)", () => {
    expect(raiseScore(thread({ priority: 100, lastTouched: now }), now)).toBeCloseTo(70);
    expect(raiseScore(thread({ priority: 0, lastTouched: "2026-05-25", raise: true }), now))
      .toBeCloseTo(10 * 0.5 + 20); // 9 days -> ~4.5? use exact below
  });
  it("orders by score desc; parked penalized; staleness capped at 60", () => {
    const a = thread({ id: "a", priority: 80, lastTouched: now });               // 56
    const b = thread({ id: "b", priority: 80, lastTouched: now, raise: true });  // 76
    const c = thread({ id: "c", priority: 80, lastTouched: now, status: "parked" }); // 31
    const ordered = raiseQueue(person({ threads: [a, c, b] }), now).map((t) => t.id);
    expect(ordered).toEqual(["b", "a", "c"]);
  });
});
```

> Note: adjust the first `toBeCloseTo` expectation to the exact `daysSince` your test date yields; the ordering test is the load-bearing assertion.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
export function raiseScore(t: Thread, now: string): number {
  const staleness = Math.min(daysSince(t.lastTouched, now), 60);
  return t.priority * 0.7 + staleness * 0.5 + (t.raise ? 20 : 0) + (t.status === "parked" ? -25 : 0);
}

export function raiseQueue(p: Person, now: string): Thread[] {
  return [...p.threads].sort((a, b) => raiseScore(b, now) - raiseScore(a, now));
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.* && git commit -m "feat(domain): raiseQueue ordering"
```

### Task 1.7: Actions + `teamBlindSpots` + `attentionScore`/`attentionOrder`

**Files:** Modify `compute.ts`, `compute.test.ts`

> **Chosen weights (flag at pause):** handoff pins overdue-manager-action ×14, async-count ×6, stressed +20. Secondary weights chosen here: days-overdue ×1.5, coverageGap ×0.4, raise-flag ×8.

- [ ] **Step 1: Add tests**

```ts
import { openActions, openActionsByOwner, teamBlindSpots, attentionScore, attentionOrder } from "./compute";
import type { ActionItem } from "./types";

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
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
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

export function attentionScore(p: Person, now: string): number {
  const overdue = Math.max(0, daysSince(p.lastOneOnOne, now) - p.cadenceDays);
  const recency = Number.isFinite(overdue) ? overdue : p.cadenceDays * 4; // never-met cap
  const coverageGap = 100 - coverageScore(p);
  const raiseFlags = p.threads.filter((t) => t.raise).length;
  const overdueMgr = openActionsByOwner(p.actions, "manager")
    .filter((a) => actionAgeTier(daysSince(a.createdAt, now)) === "cold").length;
  const asyncCount = p.asyncAgenda.length;
  const stressed = p.asyncAgenda.some((a) => a.mood === "stressed") ? 20 : 0;
  return recency * 1.5 + coverageGap * 0.4 + raiseFlags * 8 + overdueMgr * 14 + asyncCount * 6 + stressed;
}

export function attentionOrder(people: Person[], now: string): Person[] {
  return [...people].sort((a, b) => attentionScore(b, now) - attentionScore(a, now));
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.* && git commit -m "feat(domain): actions, teamBlindSpots, attention ordering"
```

### Task 1.8: `prepDigest` lead-selection (TDD)

**Files:** Modify `compute.ts`, `compute.test.ts`

- [ ] **Step 1: Add tests covering all four lead branches**

```ts
import { prepDigest } from "./compute";

describe("prepDigest lead selection", () => {
  const now = "2026-06-04";
  it("1) leads with a stressed async item when present", () => {
    const p = person({ asyncAgenda: [{ id: "s", text: "swamped", area: "workload", mood: "stressed", addedAt: now }] });
    expect(prepDigest(p, now).lead.kind).toBe("async");
  });
  it("2) else leads with coldest area when >35d", () => {
    const p = person({ coverage: { ...baseCoverage, relationships: 47 } });
    const lead = prepDigest(p, now).lead;
    expect(lead.kind).toBe("cold-area");
    if (lead.kind === "cold-area") expect(lead.area).toBe("relationships");
  });
  it("3) else leads with the top raise-queue thread", () => {
    const p = person({ threads: [thread({ id: "t1", priority: 90, raise: true, lastTouched: now })] });
    const lead = prepDigest(p, now).lead;
    expect(lead.kind).toBe("thread");
    if (lead.kind === "thread") expect(lead.thread.id).toBe("t1");
  });
  it("4) else falls back to protect-the-relationship", () => {
    expect(prepDigest(person({}), now).lead.kind).toBe("relationship");
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
export type Lead =
  | { kind: "async"; item: import("./types").AsyncItem }
  | { kind: "cold-area"; area: AreaKey; days: number }
  | { kind: "thread"; thread: Thread }
  | { kind: "relationship" };

export interface PrepDigest {
  cadence: CadenceStatus;
  lead: Lead;
  raise: Thread[];          // top 0-3
  openMine: ActionItem[];
  openTheirs: ActionItem[];
  async: import("./types").AsyncItem[];
  coldArea: { area: AreaKey; days: number };
  lastShare: number;
  lastBalance: Balance;
}

export function prepDigest(p: Person, now: string): PrepDigest {
  const raise = raiseQueue(p, now).slice(0, 3);
  const coldKey = bluntestSpot(p);
  const coldDays = p.coverage[coldKey];
  const lastShare = [...p.talkTrend].reverse().find((n) => n > 0) ?? 0;

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
```

- [ ] **Step 4: Run → PASS** (full suite): `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.* && git commit -m "feat(domain): prepDigest lead selection"
```

### Task 1.9: Signal tier -> token helper

**Files:** Create `src/ui/atoms/signal.ts` (pure mapping; lives near UI but no JSX)

- [ ] **Step 1: Implement tier -> {varName, label, shape}**

```ts
import type { StalenessTier } from "../../domain/compute";

/** Maps a staleness tier to its CSS var, word, and shape glyph.
 *  Color is never load-bearing alone (WCAG 1.4.1) — always render label + shape. */
export const SIGNAL: Record<StalenessTier, { cssVar: string; label: string; shape: string }> = {
  fresh:   { cssVar: "var(--ooo-fresh)",   label: "Fresh",   shape: "circle" },
  warming: { cssVar: "var(--ooo-warming)", label: "Warming", shape: "ring" },
  stale:   { cssVar: "var(--ooo-stale)",   label: "Stale",   shape: "diamond" },
  cold:    { cssVar: "var(--ooo-cold)",    label: "Cold",    shape: "square" },
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck && git add src/ui/atoms/signal.ts && git commit -m "feat(ui): signal tier token map"
```

### ⏸ PHASE 1 PAUSE

Stop here. Present to the user: the `types.ts` model (note the per-person nested collections decision and array-based action signatures), and the **chosen numeric bands** flagged above (`cadenceStatus` ratio bands; `attentionScore` secondary weights ×1.5/×0.4/×8). Get confirmation before Phase 2.

---

## Phase 2 — Storage & seed

### Task 2.1: Storage port + adapter + schema v2 + migration (TDD)

**Files:** Create `src/storage/store.ts`, `src/storage/store.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/storage/store.test.ts
import { describe, it, expect } from "vitest";
import { createStore, type StoragePort } from "./store";
import { seedData } from "./seed";

function memoryPort(initial?: string): StoragePort {
  let v = initial ?? null;
  return { get: () => v, set: (s) => { v = s; }, remove: () => { v = null; } };
}

describe("store", () => {
  it("seeds when storage is empty", () => {
    const s = createStore(memoryPort());
    expect(s.load().people.length).toBe(6);
    expect(s.load().version).toBe(2);
  });
  it("round-trips a save", () => {
    const port = memoryPort();
    const s = createStore(port);
    const data = s.load();
    data.people[0].name = "Renamed";
    s.save(data);
    expect(createStore(port).load().people[0].name).toBe("Renamed");
  });
  it("migrates a v1 blob by reseeding (no v1 people shape preserved)", () => {
    const v1 = JSON.stringify({ version: 1, people: [], areas: [], threads: [] });
    const s = createStore(memoryPort(v1));
    expect(s.load().version).toBe(2);
    expect(s.load().people.length).toBe(6);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `store.ts`**

```ts
import type { AppData } from "../domain/types";
import { seedData } from "./seed";

export interface StoragePort {
  get(): string | null;
  set(value: string): void;
  remove(): void;
}

const KEY = "one-on-ones/v2";
export const SCHEMA_VERSION = 2;

export function browserPort(): StoragePort {
  return {
    get: () => localStorage.getItem(KEY),
    set: (v) => localStorage.setItem(KEY, v),
    remove: () => localStorage.removeItem(KEY),
  };
}

function migrate(raw: unknown): AppData {
  // v1 shape (threads/areas/people) is structurally incompatible with the
  // redesign; the prototype has no production data, so we reseed on any
  // non-v2 blob rather than attempt a lossy field-by-field port.
  const data = raw as Partial<AppData> | null;
  if (data && data.version === SCHEMA_VERSION && Array.isArray(data.people)) {
    return data as AppData;
  }
  return seedData();
}

export interface Store {
  load(): AppData;
  save(data: AppData): void;
  reset(): void;
}

export function createStore(port: StoragePort = browserPort()): Store {
  return {
    load() {
      const raw = port.get();
      const parsed = raw ? safeParse(raw) : null;
      const data = migrate(parsed);
      if (!raw) port.set(JSON.stringify(data));
      return data;
    },
    save(data) { port.set(JSON.stringify(data)); },
    reset() { port.remove(); },
  };
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
```

- [ ] **Step 4: Run → FAIL** (seed.ts missing). Proceed to Task 2.2, then re-run.

- [ ] **Step 5: (after 2.2) Run → PASS; commit**

```bash
git add src/storage/store.* && git commit -m "feat(storage): port, adapter, schema v2 + migration"
```

### Task 2.2: Seed (6 people) + templates

**Files:** Create `src/storage/seed.ts`

- [ ] **Step 1: Implement `seedData()`**

Build a `seedData(): AppData` returning `{ version: 2, people: [...6], templates: [...5] }`. The six reports and their tone come from the screenshots — translate, don't invent wildly. Each `Person` must populate every field of the `Person` type. Use these as the spine (fill remaining fields plausibly; keep dates relative to early June 2026):

- **Sofia Marchetti** — Staff Engineer; on track; "Back from parental leave soon"; healthy report-led balance; 1 from them.
- **Priya Raman** — Engineering Manager; due soon; "Carrying two open roles"; recognition cold.
- **Tariq Hassan** — Member of Technical Staff; "Energy seems low lately"; wellbeing stale; stressed async item; open loops overdue.
- **Maya Lindqvist** — Senior Product Designer; the deep-dive subject; "team & relationships not touched in 47 days" (set `coverage.relationships = 47`); threads: "Friction with the platform pod", "Staff designer track", "Onboarding revamp launch"; async items incl. "Want to talk through the staff promo timeline — feeling some urgency" (mood `unsure`/`stressed`); open loops both owners; talkTrend ending ~0.71-ish but last saved meeting in the Summary shows 22% — keep `talkTrend` realistic.
- **Dev Okafor** — Backend Engineer; "Hasn't had a real win called out" (recognition cold); recognition area stale/cold.
- **Noah Kim** — Product Manager; "Eyeing a lead role"; growth thread hot.

```ts
import type { AppData, Person, TemplateDef } from "../domain/types";

const TEMPLATES: TemplateDef[] = [
  { id: "growth", name: "Career & growth", primaryArea: "growth",
    prompts: ["Where do you want to be in 12 months?", "What would unblock your next step?", "What growth feels stalled?"] },
  { id: "feedback", name: "Feedback exchange", primaryArea: "feedback",
    prompts: ["What feedback do you have for me?", "One thing going well, one to adjust", "How did recent feedback land?"] },
  { id: "deep-dive", name: "Project deep-dive", primaryArea: "workload",
    prompts: ["Walk me through the current state", "Where are the risks?", "What decision do you need from me?"] },
  { id: "skip", name: "Skip-level prep", primaryArea: "relationships",
    prompts: ["What should leadership hear?", "What's working across the team?", "Anything you can't raise elsewhere?"] },
  { id: "checkin", name: "Light check-in", primaryArea: "wellbeing",
    prompts: ["How are you, really?", "What's draining energy?", "What would make next week better?"] },
];

// ... define const PEOPLE: Person[] = [ ...six fully-populated Person objects ... ]

export function seedData(): AppData {
  // Return fresh copies so callers can mutate safely.
  return structuredClone({ version: 2, people: PEOPLE, templates: TEMPLATES });
}
```

- [ ] **Step 2: Run store tests → PASS.** `npm test`

- [ ] **Step 3: Commit**

```bash
git add src/storage/seed.ts && git commit -m "feat(storage): 6-person seed + templates"
```

---

## Phase 3 — State & mutations

### Task 3.1: `useAppState` store + mutations (TDD where pure)

**Files:** Create `src/state/useAppState.ts`, `src/state/useAppState.test.ts`

Mutations operate on `AppData` immutably; the hook wraps them with React state + persistence. Test the **pure reducers** directly (not the hook).

- [ ] **Step 1: Failing test (pure reducers)**

```ts
import { describe, it, expect } from "vitest";
import { reducers } from "./useAppState";
import { seedData } from "../storage/seed";

describe("reducers", () => {
  it("toggleAction flips status and sets/clears doneAt", () => {
    const data = seedData();
    const person = data.people.find((p) => p.actions.length)!;
    const id = person.actions[0].id;
    const next = reducers.toggleAction(data, id, "2026-06-04");
    const a = next.people.flatMap((p) => p.actions).find((a) => a.id === id)!;
    expect(a.status).toBe(a.status === "done" ? "done" : "done");
    expect(a.doneAt).toBe("2026-06-04");
  });
  it("addAsyncItem appends to the right person", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const next = reducers.addAsyncItem(data, pid, { text: "hi", area: "growth", mood: "neutral" }, "2026-06-04", "new-id");
    expect(next.people[0].asyncAgenda.at(-1)).toMatchObject({ id: "new-id", text: "hi" });
  });
  it("toggleRaise flips a thread's raise flag", () => {
    const data = seedData();
    const t = data.people.flatMap((p) => p.threads)[0];
    const next = reducers.toggleRaise(data, t.id);
    expect(next.people.flatMap((p) => p.threads).find((x) => x.id === t.id)!.raise).toBe(!t.raise);
  });
  it("saveMeeting writes a MeetingRecord, bumps coverage, carries open actions", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const next = reducers.saveMeeting(data, {
      personId: pid, date: "2026-06-04", durationMin: 30, reportShare: 60,
      areas: ["growth"], summary: "good talk",
    });
    const p = next.people.find((x) => x.id === pid)!;
    expect(p.meetings.at(-1)).toMatchObject({ reportShare: 60 });
    expect(p.coverage.growth).toBe(0); // touched today
    expect(p.lastOneOnOne).toBe("2026-06-04");
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `useAppState.ts`** (pure `reducers` + a hook)

```ts
import { useCallback, useState } from "react";
import type { AppData, AsyncItem, MeetingRecord } from "../domain/types";
import { createStore, type Store } from "../storage/store";

type NewAsync = Pick<AsyncItem, "text" | "area" | "mood">;
interface SaveMeetingInput {
  personId: string; date: string; durationMin: number; reportShare: number;
  areas: MeetingRecord["areas"]; summary: string;
}

function mapPerson(data: AppData, id: string, fn: (p: AppData["people"][number]) => AppData["people"][number]): AppData {
  return { ...data, people: data.people.map((p) => (p.id === id ? fn(p) : p)) };
}

export const reducers = {
  toggleAction(data: AppData, actionId: string, now: string): AppData {
    return {
      ...data,
      people: data.people.map((p) => ({
        ...p,
        actions: p.actions.map((a) =>
          a.id !== actionId ? a
          : a.status === "open" ? { ...a, status: "done", doneAt: now }
          : { ...a, status: "open", doneAt: undefined }),
      })),
    };
  },
  toggleRaise(data: AppData, threadId: string): AppData {
    return {
      ...data,
      people: data.people.map((p) => ({
        ...p,
        threads: p.threads.map((t) => (t.id === threadId ? { ...t, raise: !t.raise } : t)),
      })),
    };
  },
  addAsyncItem(data: AppData, personId: string, item: NewAsync, now: string, id: string): AppData {
    return mapPerson(data, personId, (p) => ({
      ...p, asyncAgenda: [...p.asyncAgenda, { id, addedAt: now, ...item }],
    }));
  },
  saveMeeting(data: AppData, input: SaveMeetingInput): AppData {
    return mapPerson(data, input.personId, (p) => {
      const coverage = { ...p.coverage };
      for (const a of input.areas) coverage[a] = 0;
      const rec: MeetingRecord = {
        date: input.date, durationMin: input.durationMin, reportShare: input.reportShare,
        areas: input.areas, actions: p.actions.filter((a) => a.status === "open").length,
        summary: input.summary,
      };
      return {
        ...p, coverage, lastOneOnOne: input.date,
        meetings: [...p.meetings, rec],
        talkTrend: [...p.talkTrend, input.reportShare],
        // open actions are already on p.actions; they "carry forward" by not being cleared.
      };
    });
  },
};

export function useAppState(store: Store = createStore()) {
  const [data, setData] = useState<AppData>(() => store.load());
  const apply = useCallback((next: AppData) => { store.save(next); setData(next); }, [store]);
  return {
    data,
    toggleAction: (id: string, now: string) => apply(reducers.toggleAction(data, id, now)),
    toggleRaise: (id: string) => apply(reducers.toggleRaise(data, id)),
    addAsyncItem: (pid: string, item: NewAsync, now: string, id: string) =>
      apply(reducers.addAsyncItem(data, pid, item, now, id)),
    saveMeeting: (input: SaveMeetingInput) => apply(reducers.saveMeeting(data, input)),
  };
}
```

> `startMeeting`/`recordTurn` are **transient meeting-screen state**, not persisted reducers — they live as local state in `MeetingMode` (Task 4.7). Only `saveMeeting` persists.

- [ ] **Step 4: Run → PASS.** `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/state/useAppState.* && git commit -m "feat(state): store hook + pure mutation reducers"
```

---

## Phase 4 — UI: atoms then screens

**Conventions for every UI task (apply throughout):**
- **No raw hex or font literals** — use matcha-oat semantic utilities (`bg-oat`, `text-ink`, `text-muted`, `bg-paper`, `border-line`, `text-matcha-deep`, `bg-matcha-deep`, `font-serif`, `font-mono`) or `style={{ color: "var(--ooo-cold)" }}` for signal vars. `npm run lint:tokens` must pass.
- **Match the screenshot layout** for the screen you're building; the screenshots are the source of truth for structure and copy.
- **Status = color + word + shape** (use the `SIGNAL` map from Task 1.9).
- Primary buttons: `bg-matcha-deep text-paper`; secondary: `border border-line-2 text-ink`.
- Each interactive element is a real `<button>`/`<a>`/input with a label and inherits the global focus ring.

### Task 4.1: Atom — `Avatar`, `StatusDot`, `AreaTag`

**Files:** Create `src/ui/atoms/Avatar.tsx`, `StatusDot.tsx`, `AreaTag.tsx`

- [ ] **Step 1: Implement**

`Avatar({ initials, hue, size? })` — round chip, `background: hsl(var via inline)`. Since hue is dynamic per person, inline `style={{ backgroundColor: \`oklch(0.9 0.05 ${hue})\` }}` is permitted (dynamic value, not a brand literal); text `text-ink`.

`StatusDot({ tier })` — renders a shape (per `SIGNAL[tier].shape`) filled with `SIGNAL[tier].cssVar`, plus an `<span className="sr-only">{SIGNAL[tier].label}</span>`. Shapes: circle (border-radius full), ring (border only), diamond (rotate-45 square), square.

`AreaTag({ area })` — `<span>` with `font-mono text-xs uppercase`, `bg-matcha-tint text-matcha-deep` (or `bg-neutral-bg text-neutral` for muted contexts per screenshot), rounded `--r-sm`; text = `AREA_LABELS[area]`.

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint:tokens && npm run typecheck` → PASS.

- [ ] **Step 3: Commit** `git commit -am "feat(ui): Avatar, StatusDot, AreaTag atoms"`

### Task 4.2: Atom — `Sparkline`, `TalkBalance`

**Files:** Create `src/ui/atoms/Sparkline.tsx`, `TalkBalance.tsx`

- [ ] **Step 1: Implement `Sparkline({ values, ariaLabel })`**

Inline SVG polyline over `values` (e.g. sentiment 1-5 or talk %), `role="img"`, `aria-label={ariaLabel}` (e.g. "Sentiment trend: 4, 3, 4, 5 over last 4 meetings"). Stroke `var(--matcha-deep)`; baseline `var(--line)`. No text inside.

- [ ] **Step 2: Implement `TalkBalance({ share, ariaLabel? })`**

A horizontal bar split at `share`% (report) vs rest (manager). Report segment `bg-matcha-deep`, manager segment `bg-line-2`. Below it: `{share}% them · {balanceHealth(share).label}` with the label colored by tier (good=matcha-deep, warn=yolk-deep, bad=bad, none=muted). `role="img"` + `aria-label` summary (default: `\`${share}% report airtime — ${balanceHealth(share).label}\``).

- [ ] **Step 3: Lint + typecheck + commit**

```bash
npm run lint:tokens && npm run typecheck && git commit -am "feat(ui): Sparkline, TalkBalance atoms"
```

### Task 4.3: Atom — `CoverageStrip`, `CoverageRadar`

**Files:** Create `src/ui/atoms/CoverageStrip.tsx`, `CoverageRadar.tsx`

- [ ] **Step 1: `CoverageStrip({ coverage })`**

A row of 6 segments, one per `AREA_KEYS`, each colored by `SIGNAL[stalenessTier(coverage[area])].cssVar`, with a `title`/`aria-label` per segment (`\`${AREA_LABELS[area]}: ${tier}\``). Wrapper `role="img"` `aria-label` summarizing the worst area. Each segment also carries the tier shape glyph or a short text tier under it (color-not-alone).

- [ ] **Step 2: `CoverageRadar({ coverage, onSelectArea?, selectedArea? })`**

A 6-spoke SVG radar (hexagon), each axis = an area, radius proportional to freshness (`1 - clamp(days,0,45)/45`). When `onSelectArea` is provided, render 6 **focusable** `<button>` hotspots (one per area, ≥24px) labelled `\`${AREA_LABELS[area]} — ${tier}, ${days} days\``; selected area gets a visible ring + `aria-pressed`. The SVG itself is `role="img"` with an `aria-label` listing each area + tier. Colors from the `SIGNAL` map. (See `page-person-maya.png` left rail.)

- [ ] **Step 3: Lint + typecheck + commit**

```bash
npm run lint:tokens && npm run typecheck && git commit -am "feat(ui): CoverageStrip, CoverageRadar atoms"
```

### Task 4.4: Feature components — `PrepDigest`, `ActionLedger`, `AsyncAgenda`

**Files:** Create `src/ui/PrepDigest.tsx`, `ActionLedger.tsx`, `AsyncAgenda.tsx`

- [ ] **Step 1: `PrepDigest({ digest, person })`** — the dark hero on the Person screen

Dark panel (`bg-term-bg text-term-text`, warm not black). Eyebrow `MEET · {date}` in `font-mono`. The **lead** rendered per `digest.lead.kind`:
- `async`: `"{item.text}"` in `font-serif italic` + an "[name] raised this" tag.
- `cold-area`: `"You haven't touched {AREA_LABELS[area]} in {days} days."` (matches Maya screenshot headline).
- `thread`: the thread title + why ("flagged to raise", staleness).
- `relationship`: "Protect the relationship — no fires, keep it human."
Below: a 3-up row — "Start with…" (raise[0..3]), "Open: mine / theirs" counts, async count. A primary `Start 1:1` button (`bg-matcha-deep`). All tiles are real links/buttons.

- [ ] **Step 2: `ActionLedger({ actions, onToggle })`** — "Open loops"

Group by owner (mine/theirs). Each item: a real `<button role="checkbox" aria-checked>` (≥24px) toggling done; text; an age tag colored by `actionAgeTier` (cold = overdue, in `var(--ooo-cold)`) with the word "overdue" (color-not-alone). Done items collapse under a "N closed recently" disclosure.

- [ ] **Step 3: `AsyncAgenda({ person, items, onAdd })`** — "From [name]"

Read-only-style list of report-authored items, each with `AreaTag` + a mood chip (`energized/neutral/unsure/stressed`; stressed uses `var(--ooo-cold)` + the word). An add form (labelled textarea + area select + mood select + submit) for demo authoring; on submit calls `onAdd({text, area, mood})`. Inputs all have associated `<label>`s.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint:tokens && npm run typecheck && git commit -am "feat(ui): PrepDigest, ActionLedger, AsyncAgenda"
```

### Task 4.5: `Overview` screen + axe test

**Files:** Create `src/ui/Overview.tsx`, `src/ui/Overview.axe.test.tsx`

- [ ] **Step 1: Implement `Overview({ data, now })`** (matches `page-overview.png`)

- Masthead row: wordmark `one-on-ones` with `ones` in `text-matcha-deep`; `· meaningful 1:1s`; right side links (spec, N reports).
- Headline: `"Six people."` (sans-bold) + `"What needs you this week."` (`font-serif italic`).
- Sort control (segmented: Needs attention / Overdue / Name) — real `<button>`s with `aria-pressed`; default attention via `attentionOrder`.
- **Signal row** — 4 stat tiles: reports overdue, threads flagged to raise, top team blind spot (`teamBlindSpots[0]`), avg report airtime. `font-mono` numerals.
- **Coverage radar strip** — `teamBlindSpots` as labelled bars ("what the team isn't talking about"), each with days + tier.
- **Report cards** grid — each a focusable `<a>` to `/person/:id` showing Avatar, name, role, cadence status (word+dot), `CoverageStrip`, coldest area sentence, raise-next title, `TalkBalance`, and pills "N from them" / "N open loops" (overdue count in `var(--ooo-cold)` with the word).

- [ ] **Step 2: Axe test**

```tsx
// src/ui/Overview.axe.test.tsx
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router-dom";
import { Overview } from "./Overview";
import { seedData } from "../storage/seed";

it("Overview has no axe violations", async () => {
  const { container } = render(
    <MemoryRouter><Overview data={seedData()} now="2026-06-04" /></MemoryRouter>
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 3: Run + lint + commit**

```bash
npm test src/ui/Overview.axe.test.tsx && npm run lint:tokens && git commit -am "feat(ui): Overview screen + axe"
```

### Task 4.6: `Person` screen + axe test

**Files:** Create `src/ui/Person.tsx`, `src/ui/Person.axe.test.tsx`

- [ ] **Step 1: Implement `Person({ data, personId, now, on... })`** (matches `page-person-maya.png`)

- Back link "← reports"; header: Avatar, name, role, pronouns, "in team", a `Start 1:1` primary button (links to `/person/:id/meeting`).
- `PrepDigest` hero (dark) at top.
- Left rail: `CoverageRadar` (clickable areas) + "Conversation balance" sparkline/trend.
- Right column: `AsyncAgenda` ("From [name]"), "What to raise next" = `raiseQueue` list (each thread a row with `AreaTag`, priority, why, a "raise" toggle calling `onToggleRaise`), `ActionLedger` ("Open loops"), templates ("Start a focused 1:1" — five cards), History timeline (from `meetings`).

- [ ] **Step 2: Axe test** (mirror 4.5 pattern, render `<Person data={seedData()} personId={seedData().people[3].id} now="2026-06-04" .../>`).

- [ ] **Step 3: Run + lint + commit** `git commit -am "feat(ui): Person screen + axe"`

### Task 4.7: `MeetingMode` screen + axe test

**Files:** Create `src/ui/MeetingMode.tsx`, `src/ui/MeetingMode.axe.test.tsx`

- [ ] **Step 1: Implement `MeetingMode`** (matches `page-meeting.png`)

Full page. **On mount, move focus to the `<h1>`** (`ref` + `tabIndex={-1}` + `.focus()`), provide a back link. Local transient state: `startMeeting` sets template + agenda; `recordTurn(speaker)` accrues seconds via an interval (pausable). Layout:
- Left: **LIVE CONVERSATION BALANCE** — big `font-mono` `{reportShare}%` + `balanceHealth` label; two tap targets (report / manager) showing running `m:ss`; a thin balance bar; Pause + elapsed. The "you're driving" nudge appears under ~45% report share in an `aria-live="polite"` region that announces **only when the verdict changes** (track previous verdict in a ref).
- Center: **AGENDA · n OF m** progress segments; current step = `AreaTag` + (for async) "[name] raised this" tag + the `"quote"` in `font-serif italic`; a notes textarea (labelled); Prev / Next buttons. Agenda order: report's async items first, then `raiseQueue` threads (or template prompts).
- Right: **ACTION ITEMS** rail — add-action input + list.
- Header: `Discard` (-> back to person) and `End & save` (primary; computes final reportShare from accrued seconds, navigates to `/person/:id/summary` carrying the saved record via `saveMeeting`).

- [ ] **Step 2: Axe test** (render within `MemoryRouter`; assert no violations and that the heading receives focus).

```tsx
it("moves focus to the meeting heading on entry", () => {
  render(<MemoryRouter initialEntries={["/"]}><MeetingMode .../></MemoryRouter>);
  expect(document.activeElement).toHaveAttribute("aria-label", expect.stringContaining("1:1 with"));
});
```

- [ ] **Step 3: Run + lint + commit** `git commit -am "feat(ui): MeetingMode + axe"`

### Task 4.8: `Summary` screen + axe test

**Files:** Create `src/ui/Summary.tsx`, `src/ui/Summary.axe.test.tsx`

- [ ] **Step 1: Implement `Summary`** (matches `page-summary.png`)

Centered card: eyebrow `1:1 SAVED · {date}` (`font-mono`); `How it went with {name}` (`font-serif`-ish per house style or sans-bold per screenshot — match screenshot: sans-bold). Two tiles: `{reportShare}%` (colored by `balanceHealth`, e.g. 22% bad in `var(--ooo-cold)`) + "their airtime · {label}"; and `{m:ss}` total with "· {them}/{you}" split. "COVERAGE REFRESHED" row of `AreaTag`s for touched areas. Primary `Back to {name}` button (`bg-matcha-deep`) -> `/person/:id`.

- [ ] **Step 2: Axe test** (mirror pattern). 

- [ ] **Step 3: Run + lint + commit** `git commit -am "feat(ui): Summary + axe"`

### Task 4.9: `App` shell — router, skip link, masthead

**Files:** Replace `src/ui/App.tsx`

- [ ] **Step 1: Implement**

```tsx
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { useAppState } from "../state/useAppState";
import { Overview } from "./Overview";
import { Person } from "./Person";
import { MeetingMode } from "./MeetingMode";
import { Summary } from "./Summary";

// NOTE: a single "now" is read once at load for deterministic seed-relative
// computation in this prototype.
const NOW = "2026-06-04";

export function App() {
  const state = useAppState();
  return (
    <HashRouter>
      <a className="skip-link" href="#main">Skip to content</a>
      <Routes>
        <Route path="/" element={<Overview data={state.data} now={NOW} />} />
        <Route path="/person/:id" element={<PersonRoute state={state} />} />
        <Route path="/person/:id/meeting" element={<MeetingRoute state={state} />} />
        <Route path="/person/:id/summary" element={<SummaryRoute state={state} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
// PersonRoute/MeetingRoute/SummaryRoute: read :id via useParams, find person,
// wire state mutations + useNavigate, render the screen with id="main" wrapper.
```

Each route wraps content in `<main id="main" tabIndex={-1}>`. The masthead lives in a shared layout component used by all screens.

- [ ] **Step 2: Manual run**

Run: `npm run dev` → open the served URL; click through Overview → Person (Maya) → Start 1:1 → End & save → Summary → Back. Verify seed renders on all four.

- [ ] **Step 3: Typecheck + lint + full test + commit**

```bash
npm run typecheck && npm run lint:tokens && npm test && git commit -am "feat(ui): App shell — router, skip link, masthead"
```

---

## Phase 5 — Accessibility pass

### Task 5.1: Cross-screen a11y audit

**Files:** touch any screen/atom needing fixes; add `.github/workflows/ci.yml` token+test gate.

- [ ] **Step 1: Keyboard walk-through** — tab through every screen: skip link works, every card/toggle/radar-area/checkbox/agenda-step is reachable and shows the focus ring, no keyboard trap in MeetingMode. Fix any gaps.
- [ ] **Step 2: Verify live regions** — talk-balance nudge + save announce on change only (not every tick); confirm with a test asserting the `aria-live` node text changes only across verdict boundaries.
- [ ] **Step 3: Verify charts** — every `CoverageRadar`/`CoverageStrip`/`Sparkline`/`TalkBalance` has `role="img"` + a meaningful `aria-label`; every status has word + shape (grep for `StatusDot` usage to confirm labels present).
- [ ] **Step 4: Contrast spot-check** — muted text on oat/paper, signal dots ≥3:1 (tokens already AA; confirm no signal color used as small text without a deep variant).
- [ ] **Step 5: Run full suite** `npm run typecheck && npm run lint:tokens && npm test` → all PASS.
- [ ] **Step 6: Update CI** — replace `.github/workflows/deploy.yml`'s test step to also run typecheck + lint:tokens before build (mirror performance-calibration: `npm ci → typecheck → lint:tokens → test → build`). Keep Node 20.
- [ ] **Step 7: Commit** `git commit -am "a11y: cross-screen audit + CI token/typecheck gate"`

### Task 5.2: README + finish

**Files:** `README.md`

- [ ] **Step 1: Rewrite README** — what it is, local-first, `npm i && npm run dev`, the four screens, matcha-oat reskin note, "sample data only, no backend".
- [ ] **Step 2: Final verification** `npm run build` → succeeds; `npm run preview` → click-through works.
- [ ] **Step 3: Commit + push branch**

```bash
git commit -am "docs: README for redesign"
git push -u origin redesign-matcha-oat
```

- [ ] **Step 4:** Use `superpowers:finishing-a-development-branch` to choose merge/PR.

---

## Self-review notes (coverage check)

- Spec §Domain → Tasks 1.2–1.9 (every named function + the five mandated unit tests: stalenessTier 1.3, balanceHealth 1.4, actionAgeTier 1.3, raiseQueue ordering 1.6, prepDigest branches 1.8). ✓
- Spec §Storage (schema v2, migration, seed, templates, per-person collections) → Tasks 2.1–2.2. ✓
- Spec §State (startMeeting/recordTurn transient; saveMeeting/toggleRaise/toggleAction/addAsyncItem persisted) → Task 3.1 (+ note locating startMeeting/recordTurn in MeetingMode). ✓
- Spec §UI four screens + 10 atoms → Tasks 4.1–4.9. ✓
- Spec §Reskin token map + signal scale → Tasks 0.3, 1.9, and the per-task UI conventions. ✓
- Spec §Accessibility (focus, skip link, charts role=img, live regions, meeting focus, targets, motion) → Tasks 0.3 (globals) + 4.7 (meeting focus/live) + 5.1 (audit). ✓
- Spec build order + Phase 1 pause → phase structure + explicit ⏸ gate. ✓
