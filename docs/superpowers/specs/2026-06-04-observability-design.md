# Observability — Error Monitoring + Performance/Uptime — Design Spec

**Date:** 2026-06-04
**Status:** Draft — awaiting user review
**Type:** Operational observability for the deployed app — privacy-scrubbed error monitoring, performance, and uptime. Built on top of the deployed real app (Vercel) + demo (Pages).
**Branch:** `observability`

## Goal

Give the maintainer **operational signal** — "did it break? is it up? is it fast?" — for the
live app, **without** sending any user content. Errors, performance, and uptime; explicitly
**not** product analytics or user tracking.

## Guiding rule

**Operational signal, zero user content.** Nothing sent anywhere may include note text, names,
the `data` blob, or identify a user. The app's "no surveillance" stance is preserved: telemetry
is **env-gated and off by default**, so the demo and any self-hoster send nothing unless they
explicitly opt in with their own keys.

## Locked decisions (from brainstorming)

- **Errors: Sentry** (`@sentry/react`), env-gated via `VITE_SENTRY_DSN`, no Session Replay, no
  user identification, scrubbed payloads. Sentry SaaS free tier for the author; self-hosters can
  point the DSN at any Sentry-compatible instance (incl. self-hosted Sentry/GlitchTip) or leave
  it off.
- **Performance: Vercel built-ins** (`@vercel/speed-insights` + `@vercel/analytics`), cookieless,
  rendered only when `VITE_VERCEL_INSIGHTS=1`.
- **Uptime: external monitor** (free pinger) — guided account setup, no code.
- **Scope:** errors + performance + uptime. **No** product analytics, user identification,
  session replay, custom dashboards, or log aggregation.

## Architecture

### 1. Error monitoring (Sentry) — `src/observability/`

A focused module owns all Sentry wiring so the rest of the app stays clean and the privacy
rules live in one place.

- `initObservability()` — called once in `main.tsx` before render. **Only calls `Sentry.init`
  if `import.meta.env.VITE_SENTRY_DSN` is set** (off by default). Config:
  - `dsn: VITE_SENTRY_DSN`, `environment: VITE_VERCEL_INSIGHTS ? "production" : "development"`
    (or derive from mode — exact tag decided in the plan).
  - `sendDefaultPii: false`.
  - **No Replay integration** (it records the screen → would capture note content).
  - `tracesSampleRate` low (e.g. 0.1) or 0 — perf tracing is Vercel's job; keep Sentry to errors.
  - `beforeSend` + `beforeBreadcrumb` **scrubber** (pure, exported for testing): strips request
    bodies, removes breadcrumb `data` that could carry payloads, and drops any value matching the
    app-data shape. We **never** call `Sentry.setUser` — no email, no id.
- `captureError(err, context?)` — thin wrapper the app calls (e.g. from the save/load failure
  paths) that forwards to Sentry only if initialized; `context` is restricted to safe primitives
  (e.g. `{ op: "save" }`) — never the data.
- The **scrubber** is a pure function: `scrubEvent(event) => event` — this is the unit-tested core.

### 2. React error boundary

Wrap the app (in `App.tsx`, around `AuthedApp`/the router) in Sentry's `ErrorBoundary` (or a
small custom boundary that calls `captureError`) with a graceful fallback ("Something went wrong
— reload"), so a render crash is both *survived* and *reported* (sans content).

### 3. Capture save/load failures

The existing `useAppState` already catches Supabase save failures (sets `saveError`) and the load
path can reject. Route those catches through `captureError(err, { op: "save" | "load" })` so a
silently-failing cloud write becomes a real signal — still no data attached.

### 4. Performance (Vercel) — gated

In `App.tsx`, render `<SpeedInsights/>` and `<Analytics/>` (from `@vercel/speed-insights/react`
and `@vercel/analytics/react`) **only when `import.meta.env.VITE_VERCEL_INSIGHTS === "1"`** — so
the Pages demo and non-Vercel self-hosters don't load Vercel scripts. Cookieless/anonymous; no
consent banner required.

### 5. Uptime (guided, no code)

Set up a free uptime monitor (e.g. UptimeRobot / Better Stack) watching the Vercel URL and the
Pages URL, emailing the maintainer on downtime. Documented as a runbook step.

### 6. Transparency

Update the README's privacy/"no telemetry" wording to the honest version: the **demo sends
nothing**; the **real-app build** can optionally enable **PII-scrubbed error monitoring** and
**privacy-friendly (cookieless) analytics**, both **env-gated and off by default** — self-hosters
inherit zero telemetry unless they opt in. Document the new env vars in `.env.example`.

## Environment variables (all optional, off by default)

| Var | Effect |
|---|---|
| `VITE_SENTRY_DSN` | If set, enables Sentry error monitoring (the author sets theirs in Vercel; self-hosters set their own or leave off) |
| `VITE_VERCEL_INSIGHTS` | `=1` renders Vercel Speed Insights + Analytics (author sets on Vercel) |

No secrets in the repo; values live only in the host's env settings + the gitignored `.env`.
The Sentry DSN is a client-side ingest key (publishable by design), not a secret.

## Testing

- **Scrubber (node, pure):** given a synthetic Sentry event carrying request bodies / data-shaped
  fields, `scrubEvent` removes them; a benign event passes through.
- **Off-by-default guard:** `initObservability()` does **not** initialize Sentry when
  `VITE_SENTRY_DSN` is unset (assert `Sentry.init` not called — via a spy/mock).
- **`captureError` no-ops when uninitialized** (no throw).
- Vercel components are render-only (no test).
- Existing tests stay green; both builds (`local` and `supabase`) compile; demo build loads no
  Sentry and no Vercel scripts.

## File structure

| File | Change |
|---|---|
| `src/observability/sentry.ts` | `initObservability`, `captureError`, `scrubEvent` | 
| `src/observability/sentry.test.ts` | scrubber + off-by-default + no-op tests |
| `src/main.tsx` | call `initObservability()` before render |
| `src/ui/App.tsx` | error boundary; gated `<SpeedInsights/>`/`<Analytics/>` |
| `src/state/useAppState.ts` | route save/load catches through `captureError` |
| `.env.example` | document `VITE_SENTRY_DSN`, `VITE_VERCEL_INSIGHTS` |
| `README.md` | honest telemetry/privacy wording |
| `package.json` | `@sentry/react`, `@vercel/speed-insights`, `@vercel/analytics` |

## Non-goals

- Product analytics / behavioral tracking; user identification; session replay.
- Sentry performance tracing dashboards (errors only); custom dashboards; log aggregation.
- Forcing telemetry on self-hosters (it is opt-in, off by default).

## Open questions for implementation-planning

- Exact Sentry `environment` tag derivation (env flag vs Vite `import.meta.env.MODE`).
- Whether to use Sentry's built-in `ErrorBoundary` vs a tiny custom one calling `captureError`
  (recommend Sentry's, with a token-styled fallback).
- Source-map upload (readable stacks) — optional enhancement via `@sentry/vite-plugin` +
  `SENTRY_AUTH_TOKEN`; default OFF to keep the build simple (decide in the plan).
- Sentry SDK bundle-size impact on the demo build — confirm it's tree-shaken out when no DSN
  (init is gated, but the SDK import still bundles; consider dynamic `import()` so the demo
  doesn't ship Sentry).

## Risks & mitigations

- **Leaking note content via Sentry.** Mitigation: no Replay, `sendDefaultPii:false`, no
  `setUser`, an explicit `scrubEvent` with a unit test asserting data-shaped fields are removed;
  never pass `data` to `captureError`.
- **Telemetry foisted on self-hosters.** Mitigation: everything env-gated, off by default;
  README states it plainly.
- **Bundle bloat on the demo.** Mitigation: gate Sentry behind a dynamic import so the demo
  (no DSN) doesn't ship the SDK (confirm in the plan).
