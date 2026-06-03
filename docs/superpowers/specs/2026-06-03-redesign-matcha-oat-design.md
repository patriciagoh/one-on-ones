# one-on-ones — Redesign on Matcha Oat — Design Spec

**Date:** 2026-06-03
**Status:** Approved
**Type:** Redesign + feature build-out of an existing local-first web app, reskinned to the Matcha Oat design system
**Branch:** `redesign-matcha-oat`

## Purpose

`one-on-ones` is a manager's tool that sits *around* 1:1s (not inside the meeting)
to make sure, over weeks and months, the important things actually get talked about
and follow-through doesn't drift. This work is a redesign that:

1. Expands the app from a single thread-centric screen to **four screens** —
   Overview, Person, Meeting Mode, and a save Summary.
2. Adds three features — a pre-1:1 **Prep Digest**, an **Action Ledger** (open
   loops / commitments), and a report-authored **Async Agenda**.
3. **Reskins** the whole surface from the prototype's electric-blue / Space Grotesk
   look onto the shared **Matcha Oat design system**.

It remains **local-first**: no backend, no telemetry, no network calls. Single user
(a manager with several reports). It is explicitly **not** a live note-taker or
in-meeting co-pilot beyond the optional talk-balance meter.

### Relationship to the prior version

The repository currently holds an older, simpler app (thread-centric, a single
`PersonScreen`, seed people Alex/Priya/Sam). Per the locked decision this redesign
is a **fresh rewrite of `src/`**: it does not reuse the old `compute.ts` /
`store.ts` / UI code. It does, however, **preserve the layered architecture and the
injectable-localStorage boundary** described below, and re-implements the reusable
concepts (staleness, cadence, area coverage, raise-queue) against the new, richer
data model. The old code remains in git history.

## Source of truth

- **Behavior + layout:** the handoff doc (`Claude Code Handoff.md`) and the four
  reference screenshots (Overview, Person/Maya, Meeting, Summary). The screenshots
  define layout; the handoff defines rules and numbers.
- **Visual system:** `matcha-oat-design-system` (`tokens.css` is the only place real
  color/font values live). WCAG 2.2 AA.

## Architecture (four layers — boundaries preserved through the rewrite)

```
src/domain    pure logic + types        (no React, no DOM)
src/storage   seed + persistence        (injectable localStorage interface)
src/state     store + mutations
src/ui        atoms + four screens
```

All new logic lives in `domain` as **pure, unit-testable functions**. A thin storage
module wraps `localStorage` behind a small interface so a real backend could replace
it later without touching computation or UI.

### Routing

React Router, four routes. Meeting and Summary are **real pages, not modals**
(accessibility requirement — see §Accessibility):

- `/` — Overview
- `/person/:id` — Person
- `/person/:id/meeting` — Meeting Mode
- `/person/:id/summary` — save Summary ("How it went with …")

## Data model (`src/domain/types.ts`)

```ts
type AreaKey = 'growth'|'feedback'|'workload'|'wellbeing'|'relationships'|'recognition';

interface Person {
  id: string; name: string; role: string; pronouns: string; initials: string;
  hue: number; tenureMonths: number;
  cadenceDays: number;            // expected days between 1:1s
  lastOneOnOne: string | null;    // ISO
  nextScheduled: string | null;   // ISO
  talkTrend: number[];            // last N meetings, % of airtime the REPORT held (0 = no meeting)
  sentimentTrend: number[];       // 1-5
  coverage: Record<AreaKey, number>; // days since each area was meaningfully discussed
  threads: Thread[];
}

interface Thread {
  id: string; title: string; area: AreaKey;
  status: 'open'|'parked'; priority: number; // 0-100
  lastTouched: string;          // ISO
  note: string; raise: boolean; // manager-flagged "raise next time"
}

interface ActionItem {
  id: string; text: string; owner: 'manager'|'report';
  status: 'open'|'done'; createdAt: string; doneAt?: string;
  fromArea?: AreaKey; linkedThread?: string;
}

interface AsyncItem {              // report-authored, before the 1:1
  id: string; text: string; area: AreaKey;
  mood: 'energized'|'neutral'|'unsure'|'stressed'; addedAt: string;
}

interface MeetingRecord {
  date: string; durationMin: number; reportShare: number; // %
  areas: AreaKey[]; actions: number; summary: string;
}
```

The **six coverage areas are fixed** for this prototype (not manager-editable —
handoff §7 Q1 deferred).

## Domain — pure functions (`src/domain/`)

- `stalenessTier(days)` -> `fresh <=10 | warming <=21 | stale <=35 | cold >35`
- `cadenceStatus(person)` -> `ontrack | due | stale | cold` vs `cadenceDays`
- `coverageScore(person)` -> 0-100 (each area 0d->1.0, >=45d->0; averaged)
- `bluntestSpot(person)` -> the single most-stale coverage area (the blind spot)
- `balanceHealth(share)` -> `bad <40 | warn 40-54 | good 55-78 | warn >78`
  ("You're driving" / "Manager-heavy" / "Report-led" / "Hands-off"); 0 = no data
- `raiseQueue(person)` -> threads ranked by
  `priority*0.7 + min(staleness,60)*0.5 + (raise?20:0) + (parked?-25:0)`
- `teamBlindSpots(people)` -> coverage areas ranked by team-average staleness
  (+ count "going cold")
- `attentionScore(person)` / `attentionOrder(people)` -> who needs attention;
  factors recency, coverage gap, raise flags, **overdue manager actions (x14),
  async item count (x6), a stressed async flag (+20)**
- `actionAgeTier(days)` -> `fresh <=7 | warming <=21 | cold >21 ("overdue")`
- `openActions(personId)` / `openActionsByOwner(personId, owner)` — open items,
  oldest first
- `prepDigest(person)` -> the pre-1:1 card:
  `{ cadence, lead, raise[0..3], openMine, openTheirs, async, coldArea, lastShare, lastBalance }`.
  **`lead`** is chosen in priority order: (1) a `stressed` async item, else
  (2) coldest area if >35d, else (3) top raise-queue thread, else
  (4) "protect the relationship".

**Unit tests** concentrate on: `stalenessTier`, `balanceHealth`, `actionAgeTier`,
`raiseQueue` ordering, and `prepDigest` lead-selection branches.

## Storage / seed (`src/storage/`)

- Injectable-localStorage interface (same pattern as before).
- Persisted **schema v2** with a migration from any v1 data found.
- Collections per person: `coverage` days-map, `meetings: MeetingRecord[]`,
  `actions: ActionItem[]` (the ledger), `asyncAgenda: AsyncItem[]`.
- Global `templates` — five 1:1 types, each pre-loading a prompt agenda + a primary
  area: **Career & growth, Feedback exchange, Project deep-dive, Skip-level prep,
  Light check-in.**
- A realistic **6-person seed**: Sofia, Priya, Tariq, Maya, Dev, Noah — translated
  from the prototype so the app is useful the moment it opens.

## State / mutations (`src/state/`)

`startMeeting(personId, templateId?)`, `recordTurn(speaker)` (accrues talk seconds),
`saveMeeting()` (writes a `MeetingRecord`, bumps `coverage` for touched areas,
carries open actions forward), `toggleRaise(threadId)`, `toggleAction(actionId)`
(open<->done, sets/clears `doneAt`), `addAsyncItem(personId, {text, area, mood})`.

## UI — four screens + atoms (`src/ui/`)

Layout matches the reference screenshots; visuals come from Matcha Oat tokens.

1. **Overview** — masthead; a signal row (reports overdue, threads to raise, top
   team blind spot, avg report airtime); the team coverage-radar strip; report
   cards showing cadence status, coverage strip, coldest area, raise-next,
   talk-balance, and pills for "N from them" (async) and "N open loops" (overdue in
   the alert color). Sortable by attention / overdue / name.
2. **Person** — header with a dark blind-spot panel; **`PrepDigest` hero** at the
   top; left rail = coverage radar (6 clickable areas) + conversation-balance
   trends; right column = **`AsyncAgenda` ("From [name]")**, the raise-next queue,
   **`ActionLedger` ("Open loops")**, templates, and a history timeline.
3. **Meeting Mode** (full page) — live talk-time meter (tap who holds the floor;
   "you're driving" nudge under ~45%); an agenda that **leads with the report's
   async items** (tagged "[name] raised this") then raise-queue threads (or template
   prompts); per-step notes; an action-items rail. Ends by saving a summary.
4. **Summary** — "How it went with [name]": final report airtime + balance verdict,
   total duration split, coverage refreshed, and a "Back to [name]" return.

**Atoms:** `Avatar`, `StatusDot`, `Sparkline`, `CoverageRadar`, `CoverageStrip`,
`TalkBalance`, `AreaTag`, `PrepDigest`, `ActionLedger`, `AsyncAgenda`.

## Reskin — Matcha Oat token mapping

Consume the system the same way the other build apps do:
`npm i github:patriciagoh/matcha-oat-design-system`, the **Tailwind preset** in
`tailwind.config.ts`, `tokens.css` + `fonts.css` imported in `src/index.css`. No raw
hex or font literals in `src/ui` — enforced by `scripts/lint-tokens.mjs` in CI.

| Prototype | Matcha Oat |
|---|---|
| electric-blue primary (buttons, logo accent, progress, links) | `--matcha-deep` (7.0:1 on white) |
| sparing accent (active underline, highlight wash) | `--yolk` |
| Space Grotesk (UI) | `--sans` (Hanken Grotesk) |
| human-voice italic | `--serif` (Newsreader) |
| data labels | `--mono` (Space Mono) |
| dark blind-spot / "punchline" panel | `--term-bg` / `--term-text` (warm, never black) |

**Signal scale** (`src/styles/tokens.ooo.css`, app-specific tokens that resolve to
matcha-oat base tokens) — a coherent warm green->amber->rust 4-step ramp, reserved
for coverage health. **Every tier always pairs color with a word + shape** so color
is never load-bearing alone (WCAG 1.4.1):

```
--ooo-fresh:   var(--matcha-deep)   #4E6B3A   (good)
--ooo-warming: var(--matcha)        #6E8B57
--ooo-stale:   var(--yolk-deep)     #8E6416   (warn)
--ooo-cold:    var(--bad)           #9B3D2E   (alert)
```

Headlines keep the screenshots' **mixed treatment** — a sans-bold lead clause plus a
serif-italic continuation (e.g. "Six people." + "What needs you this week.").

## Accessibility — WCAG 2.2 AA (non-negotiable)

- **Contrast 1.4.3 / 1.4.11:** muted text >=4.5:1 (matcha-oat `--muted` is AA);
  signal colors used as dots/bars >=3:1; re-theme signal palette per surface.
- **Not color alone 1.4.1:** every status pairs color with a word + shape; charts
  (radar, strip, balance) carry `role="img"` + a text `aria-label` summary.
- **Keyboard 2.1.1 / 2.4.7 / 2.4.13:** report cards, thread toggles, agenda steps,
  radar areas, and action checkboxes are real focusable controls with a visible
  high-contrast `:focus-visible` ring (matcha-oat `--focus`); skip link +
  `scroll-padding-top` clear the sticky nav.
- **Meeting 2.4.3 / 4.1.2:** full page (not a dialog); move focus to its heading on
  entry; provide a back link.
- **Live regions 4.1.3:** the talk-balance nudge + save toast use
  `aria-live="polite"`; announce the balance verdict only when it changes, not every
  tick.
- **Targets / motion 1.3.1 / 2.5.8 / 2.3.3:** labels on all inputs; >=24px targets;
  collapse animation under `prefers-reduced-motion`.

Verified with `vitest-axe` per screen.

## Testing & definition of done

- Domain pure functions unit-tested (see §Domain).
- `vitest-axe` smoke test per screen.
- **Definition of done:** typechecks clean, `lint:tokens` passes (no raw values in
  `src/ui`), tests pass, and the four screens render with the seed data.

## Build order (commit after each phase)

1. **types & domain** — then **pause for review of the type model** (handoff request).
2. storage / seed (+ schema migration)
3. state / mutations
4. UI — atoms then the four screens
5. accessibility pass

## Out of scope (prototype)

- Backend, auth, accounts, multi-user, real-time sync, telemetry, integrations
  (calendar / Zoom / Slack / HR).
- Manager-editable coverage areas (handoff §7 Q1 — the six are fixed).
- A real report-facing surface; the Async Agenda ships as a read-only preview and
  the report sees none of the manager's notes (handoff §7 Q3 default).
- Automatic talk-time capture; the manual tap stays (handoff §7 Q2).
- Mobile-specific layout (desktop browser is the target).
- New dependencies beyond React Router, the matcha-oat dep, and the test/axe
  tooling, without asking.
- No emoji in code or copy (Ada house rule).
```
