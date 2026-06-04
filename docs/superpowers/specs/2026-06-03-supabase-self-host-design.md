# one-on-ones — Productionize & Self-Host on Supabase — Design Spec

**Date:** 2026-06-03
**Status:** Draft — awaiting user review
**Type:** Architecture change — add a real backend (Supabase) to an existing local-first web app, harden it, and make it open-source self-hostable
**Suggested branch:** `supabase-self-host`

## Purpose

Today `one-on-ones` is a single-user, local-first app: all data lives in one
browser's `localStorage` behind an injectable `StoragePort`, and the app reseeds
demo data on first load. This work turns it into a **productionalized, safe app
that the author actually uses**, and an **open-source project a stranger can host
for themselves** — without the author ever hosting, seeing, or being liable for
anyone else's data.

Three goals, in the author's words:

1. **Productionalized & safe** for real day-to-day use with genuinely sensitive
   content (a manager's private notes on reports — performance, wellbeing,
   sentiment).
2. **Open-source & self-hostable** — anyone can take the code and run their own
   instance.
3. **An "empty version"** — a fresh install starts blank, not full of demo people.

## Core decisions (locked with the author)

These were settled through discussion; rationale captured so future-us doesn't
relitigate them.

| Decision | Choice | Why |
|---|---|---|
| **Hosting model** | **Self-hosted backend (each user runs their own instance)** — *not* author-hosted SaaS, *not* browser-only | "Feels like SaaS but I don't host users." Each instance is an island; nobody centralizes others' sensitive data. The author runs one instance for themselves. |
| **Backend** | **Supabase** (Postgres + built-in Auth + Row Level Security) | Most-used in its category (open-source, web, self-hostable) and most expandable 3–6 months out: Postgres is industry-standard, RLS is the native multi-tenant primitive, free hosted tier *and* full self-host both exist. Firebase rejected (can't self-host); PocketBase rejected (niche, less expandable). |
| **Tenancy** | **Single-user per instance to start**, but **every row is owner-aware** from day one (RLS keyed on `auth.uid()`) | Cheapest forward-compatible decision: expanding to multi-user teams later becomes *additive* (add sign-up + drop the single-user assumption), not a rewrite. |
| **Auth** | **Email + password** (Supabase Auth). Google/magic-link explicitly deferred. | Works the instant someone deploys — zero external setup for self-hosters. Supabase hashes passwords (bcrypt); we never write auth code. Google OAuth would force every self-hoster through a per-instance Google Cloud setup. |
| **Demo vs real** | **Build flag.** Demo build = seeded, local-only, no login (today's behavior, reusing `StoragePort` + `seed.ts`). App build = Supabase adapter + login, starts **empty**. | Keeps the public Pages demo impressive while real/self-hosted installs start clean. |
| **Connectivity** | **Online-first.** Read-cache deferred; full offline+sync explicitly out. | Offline+sync means conflict resolution — the hardest problem in app dev and the likeliest place a solo project drowns in data-loss bugs. A desk tool for 1:1s doesn't need it. |

## Non-goals / explicitly deferred

- **Offline editing + sync** (conflict resolution). Online-first only for v1.
- **Multi-user teams & data sharing** (skip-levels, rollups). The data model is
  *prepared* for it (owner column + RLS) but no sign-up/roles/sharing UI is built.
- **Google / magic-link sign-in.** Additive later; email+password ships first.
- **Server-side features** (email "1:1 due" reminders, AI summaries). Possible
  later on Supabase; not in scope.
- **A read cache for instant load / offline viewing.** Easy phase-2 polish, not v1.

## Architecture

The app stays a **static frontend** (React + TS + Vite + Tailwind, deployed to a
static host). Supabase is the backend; there is no custom server to write. The
existing four-layer architecture (`domain` / `storage` / `state` / `ui`) and the
`StoragePort` seam are **preserved** — this is the key reason the change is small.

### The `StoragePort` becomes the swap point

`StoragePort` already abstracts persistence (`get` / `set` / `remove`). Today the
only implementation is `browserPort` (localStorage). We add a second
implementation and select between them by build mode:

```
                       ┌────────────────────────────────────┐
                       │  React app (static, on a CDN/Pages)  │
                       │                                      │
   build = "demo"  ──► │  StoragePort                         │
   (no login,          │    ├─ browserPort   → localStorage   │  ← demo build
    seeded)            │    │                   (+ seed.ts)    │
                       │    └─ supabasePort  → Supabase ──────┼──┐  ← app build
   build = "app"   ──► │  (login required, starts empty)      │  │
                       └──────────────────────────────────────┘  │
                                                                  ▼
                                                   ┌──────────────────────────┐
                                                   │  THAT instance's Supabase │
                                                   │  • auth.users (email/pw)  │
                                                   │  • people / threads / …   │
                                                   │  • Row Level Security      │
                                                   │    (owner = auth.uid())    │
                                                   └──────────────────────────┘
```

**Demo build:** unchanged behavior — `browserPort`, seeded, no auth. This is what
ships to the public GitHub Pages demo.

**App build:** `supabasePort`, requires email+password login, starts empty. This
is what the author runs and what self-hosters deploy.

Selection is a Vite env flag (e.g. `VITE_BACKEND = "local" | "supabase"`) read at
build time, so the two modes don't ship each other's code paths.

### Data model & Row Level Security

The current in-memory model (`AppData { people[], templates[] }`, each `Person`
nesting `threads` / `actions` / `asyncAgenda` / `meetings`) maps to Postgres
tables. The **load/save shape stays the same** so `domain` and `state` layers are
untouched: `supabasePort.get()` reads the user's rows and assembles the same
`AppData` JSON the app already expects; `set()` writes it back. (Whether to store
as normalized tables vs. a single JSON document per user is an implementation-plan
decision; normalized is the more expandable default and is recommended.)

The non-negotiable rule: **every row carries `owner uid` and RLS enforces
`owner = auth.uid()`** so a user can only ever read/write their own data. This is
both the security boundary for v1 and the seam that makes multi-user additive.

### Online-first data flow

- On login → fetch the user's data from Supabase → render.
- Edits → write through to Supabase. Loading and error states are first-class:
  every screen handles "loading", "save failed / retry", and "offline" gracefully
  (no silent data loss; surface failures).
- No background sync, no local write queue (that's the deferred offline work).

## Open-source / self-host packaging

The stranger's experience is only as good as the packaging. Required deliverables:

- **`LICENSE`** (makes it legally open source — pick a permissive license, e.g. MIT).
- **README "Run your own" section** with the Path A flow: create a free Supabase
  project → run the setup script → fill in two config values → deploy → sign up.
- **Database setup script** (SQL) that creates tables + RLS policies in one paste.
- **`.env.example`** config template (Supabase URL + anon key, build flag).
- **Optional "Deploy to Vercel/Netlify" button** to collapse the deploy step.
- Document the **full self-host** path (running Supabase via Docker) briefly for
  the technical few.

Honest constraint recorded: self-hosting requires technical comfort (creating a
Supabase project, editing config, deploying). This is inherent to the model and is
the price of nobody hosting anyone else's sensitive data.

## Hardening / productionize pass

This is the "make it safe" half of the original ask. Runs against the app build:

- **Security review** (`/security-review`) focused on: RLS policies actually
  enforce owner isolation, the anon key is the *only* key shipped to the browser
  (never the service-role key), auth flows, no secrets in the repo, dependency
  health.
- **Code review** (`/code-review` at high effort) for correctness + AI slop;
  triage into must-fix-before-use vs later.
- **Tests** on the new critical paths first: the `supabasePort` adapter, the
  login/empty-state flow, and load/save round-trips. Existing 55 tests + axe
  coverage must stay green; the demo build's behavior must not regress.
- **CI gate** extended to cover the new build mode (typecheck, lint:tokens, tests,
  build) for both `local` and `supabase` flags.
- **`/simplify`** pass **last**, once tests exist.

## Phasing — what comes first

Each phase is independently shippable and becomes its own implementation plan.

1. **Phase 1 — Baseline hardening (no architecture change).** Run security +
   code review on the *current* local-first app; fix the cheap, high-value
   findings; add the `LICENSE`. Gets value immediately and de-risks the rest.
2. **Phase 2 — Backend foundation.** Add Supabase: schema + RLS, the
   `supabasePort` adapter behind the existing interface, the `VITE_BACKEND` build
   flag, and email+password auth. App build starts empty; demo build unchanged.
   Tests for the adapter + auth + empty-state. **This is the core of the project.**
3. **Phase 3 — Online-first UX.** Loading/error/save-failure states on every
   screen; make the logged-in experience feel solid.
4. **Phase 4 — Self-host packaging.** README run-your-own section, SQL setup
   script, `.env.example`, deploy button, self-host docs. Extend CI to both modes.
5. **Phase 5 (optional, later).** Read-cache for instant load; then, only if
   wanted, multi-user teams (the RLS/owner groundwork is already laid).

## Risks & mitigations

- **RLS misconfigured → data leak between users.** Mitigation: RLS is the explicit
  focus of the security review; tests assert a user cannot read another owner's
  rows. (Low blast radius in single-user-per-instance, but this is *the* security
  control.)
- **Service-role key leaking into the frontend.** Mitigation: only the public anon
  key is ever bundled; review + a check that the service key is never imported in
  `src/`.
- **Demo build regressing during the refactor.** Mitigation: keep `browserPort`
  and seed untouched; CI runs the demo build path too.
- **Scope creep into teams/offline.** Mitigation: those are named non-goals; the
  groundwork (owner column) is the *only* concession to the future.

## Open questions for implementation-planning

- Normalized tables vs. one JSON document per user for `supabasePort` (recommend
  normalized for expandability; confirm in the plan).
- Choice of permissive license (MIT vs. Apache-2.0).
- Static host for the app build (Vercel/Netlify vs. keeping Pages).
