# one-on-ones

A local-first manager's tool for running meaningful 1:1s. No backend, no
telemetry, no accounts — everything lives in your browser's localStorage and
is seeded with realistic sample data the moment you open it.

Live demo: https://patriciagoh.github.io/one-on-ones/

## What it is

One-on-ones are easy to do badly: the manager talks too much, the same topics
keep coming up while whole areas go untouched, and action items evaporate
between sessions. This tool sits *around* the 1:1 — not inside the meeting —
and surfaces what actually needs attention week to week.

## Four screens

**Overview** — All your reports at a glance. Sorted by attention score (or
overdue cadence, or name). Each card shows cadence status, a six-area coverage
strip, the coldest topic, the last talk balance, and open-loop counts. A
team-wide coverage radar shows what the whole group isn't talking about.

**Person** — Deep-dive on one report. A prep digest (the dark panel) leads
with the highest-signal issue: a stressed async item, the bluntest coverage
gap, or the top raise-queue thread. Below it: the six-spoke coverage radar
(clickable for area detail), conversation-balance sparkline, async agenda
("From [name]"), raise-queue threads, open action loops, focused 1:1 templates,
and a meeting history timeline.

**Meeting Mode** — Live session. Tap who holds the floor to track talk time;
a nudge appears when the manager is driving below 45% report share. The agenda
leads with the report's async items then raise-queue threads. Per-step notes
and an action-items rail capture commitments. End the session to save a record.

**Summary** — Post-meeting recap. Shows the final report airtime percentage
and balance verdict, total duration and split, and which coverage areas were
refreshed. Returns to the Person screen.

## Sample data only, no backend

The six seed people (Sofia, Priya, Tariq, Maya, Dev, Noah) are demo data.
Nothing is sent to a server. Clearing your browser's site data resets to the
seed. The app is single-user — one manager's view.

## Design system

Reskinned onto the [Matcha Oat design system](https://github.com/patriciagoh/matcha-oat-design-system).
All colors and fonts come from design tokens; no raw hex or font literals in
`src/ui`. A CI guardrail (`npm run lint:tokens`) enforces this.

WCAG 2.2 AA throughout: skip link, visible focus rings, `<main id="main">` on
every route, live region for talk-balance verdict changes, charts carry
`role="img"` and a text `aria-label`, every status pairs color with a word and
shape.

## Getting started

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173/one-on-ones/
```

## Scripts

```bash
npm test              # run all unit + axe tests once (Vitest)
npm run typecheck     # tsc --noEmit
npm run lint:tokens   # ensure no raw hex/font literals in src/ui
npm run build         # tsc -b && vite build -> dist/
npm run preview       # preview the dist/ build locally
```

## Architecture

```
src/domain/     pure logic + types (no React, no DOM); all unit-tested
src/storage/    localStorage adapter behind injectable interface; schema v2; seed
src/state/      useAppState hook + pure mutation reducers
src/ui/         four screens + atoms (Avatar, CoverageRadar, TalkBalance, etc.)
```

Routes use a HashRouter so GitHub Pages needs no server-side rewrite:
`/`, `/person/:id`, `/person/:id/meeting`, `/person/:id/summary`.
