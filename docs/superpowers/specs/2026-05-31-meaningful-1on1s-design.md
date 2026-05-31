# Meaningful 1:1s — Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Type:** Prototype — local web app

## Purpose

A tool that sits *around* a manager's 1:1s (not inside the meeting) to make sure,
over weeks and months, the important things actually get talked about and nothing
drifts. It answers two questions at a glance, per report:

1. **What should I bring up next time?**
2. **Are we covering the right ground over time?**

It is explicitly **not** a live note-taker or in-meeting co-pilot. The conversation
stays in the room; the tool guards balance, continuity, and follow-through.

This is a prototype to test whether the idea is any good — optimize for learning,
not production polish. Single user (a manager with several reports). No auth, no
multi-user, no real-time collaboration.

## Core concept

**Everything is a thread. Areas, coverage, and cadence are lenses on threads — not
separate things you maintain.** You capture real threads from your working
relationship; the framework (areas, coverage map, cadence warnings) is *computed*
from them, never filled in by hand. That is what keeps it from feeling like a
compliance checklist.

- **One input:** capture a thread.
- **Four lenses:** open-loops (emergent importance), area tags (coverage),
  the person's picture (blind spots), cadence (rhythm).
- **One primary output:** a per-person screen showing both "what's drifting over
  time" and "what to raise now."

## Data model

### Thread — the atom
- `id`
- `personId`
- `area` — one of the defined Areas
- `type` — `topic` | `open-loop` | `commitment`
- `title` — short text
- `notes` — optional longer text
- `owner` — for `commitment` only: `you` | `them`
- `state` — `active` | `snoozed` (with `snoozedUntil`) | `resolved`
- `createdAt`
- `touches` — array of `{ date, note? }` (see Touch). `lastTouchedAt` is derived
  from the most recent touch, falling back to `createdAt`.

### Person — a report
- `id`, `name`
- `cadenceDays` — expected gap between 1:1s (e.g. 7)
- `picture` — array of `{ text, area? }` free-text goals/pressures. Powers
  blind-spot detection.

### Area — a dimension
- `id`, `name`
- `cadenceDays` — healthy frequency for this kind of conversation (e.g. Career = 28)
- Default set (all editable, add/remove/rename globally):
  Career & growth, Wellbeing & workload, Performance & feedback,
  Goals & priorities, Team & relationships, Recognition.

### Touch — "we talked about this"
- Logged against a thread: `{ date, note? }`.
- A "meeting" is implicit — just the set of touches sharing a date. No Meeting entity.

## Derived computations (the intelligence)

All derived live from threads + people + areas; nothing stored.

- **Raise next (ranked):** active threads scored by staleness vs. cadence.
  Inputs to the score: how far `lastTouchedAt` is past the relevant cadence
  (area cadence, and person cadence as a floor), thread type (commitments you owe
  rank up), and age. Top 2–3 float to a highlighted band.
- **Area coverage:** per area, the last ~12 weeks bucketed by week — touched or not
  (from touches on threads in that area) — plus `lastTouchedAt` and an ⚠ when past
  the area's cadence.
- **Blind spots:** picture items (or areas) with **no active thread** → surfaced as
  a gentle "ask about it?" prompt.
- **Open loops / commitments:** active threads of those types, grouped, with age and
  (for commitments) owner and done-state.

## The screen (one primary surface, per person)

A single per-person view. Coverage-over-time is the spine; the "raise next"
intelligence is woven in rather than living on a separate page.

Top to bottom:
1. **Quick-capture** — one box; the only thing you type. Captures a thread (with
   area + type, defaulting sensibly).
2. **Raise next** — highlighted band: top 2–3 stale/overdue/blind-spot threads,
   each annotated with *why* it surfaced. Tap → ✓ discussed (logs a touch) /
   💤 snooze / ✔ resolve.
3. **Area coverage** — the sparkline table: area × last-12-weeks, last-touched,
   cadence ⚠ inline on the row.
4. **Open loops** / **Commitments** (both directions) / **Recently resolved** —
   underneath.

A lightweight **people switcher** (sidebar or top tabs) moves between reports; each
report shows overdue/at-a-glance status.

## Out of scope (prototype)

- Live/in-meeting note-taking UI.
- Auth, accounts, multi-user, sharing, real-time sync.
- Integrations (calendar, Slack, Linear, HR systems).
- Mobile-specific layout (desktop browser is fine).
- The report-side experience (this is the manager's tool for now).
- AI-generated question suggestions (cadence/blind-spot prompts are rule-based;
  a curated static prompt per area is acceptable, generation is not).

## Tech approach

A single-page web app with **no backend** — state persisted to the browser's
`localStorage`, seeded with sample data (Alex/Priya/Sam) so it's useful the moment
it opens.

- *Stack:* **React + TypeScript**, built with **Vite**, styled with **Tailwind CSS**.
- *Why no backend:* zero infra, instant to run and demo. The real complexity lives
  in pure, testable derived-computation functions, not plumbing.
- *Persistence boundary:* a thin storage module wraps `localStorage` behind a small
  interface so a real backend could replace it later without touching the
  computation or UI layers.
- *Layering:* (1) data model + pure derived-computation functions, (2) storage
  module, (3) React UI. The first layer has no React/DOM dependency.

## Testability

The derived computations (ranking, coverage bucketing, cadence ⚠, blind-spot
detection) are pure functions over the data model — unit-testable in isolation
with fixture data, independent of the UI and storage. That is where the real logic
lives and where tests should concentrate.
