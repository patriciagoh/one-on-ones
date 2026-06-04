# Phase 2a — Backend Foundation (Cloud Storage Plumbing) — Design Spec

**Date:** 2026-06-03
**Status:** Draft — awaiting user review
**Type:** First of three sub-pieces of Phase 2 (the Supabase backend). 2a = cloud-storage plumbing; 2b = login UI; 2c = config/deploy/packaging.
**Parent spec:** `docs/superpowers/specs/2026-06-03-supabase-self-host-design.md`
**Suggested branch:** `phase2a-backend-foundation`

## Goal

Give the app a place to store data in Supabase and the code to read/write it there,
behind the existing `StoragePort` seam — **without** building login screens yet (that's
2b). After 2a, the app *can* persist a user's data to the cloud (given a logged-in
session); a human can't log in through the UI until 2b.

## Locked decisions (from brainstorming)

- **Data shape:** one JSON document per user. The whole `AppData` blob is stored as a
  single row, not normalized into per-entity tables. Chosen because it's a near drop-in
  behind the whole-blob `StoragePort`, fits the tiny single-user data, and can be
  normalized later behind the same seam if team-sharing ever needs it.
- **Empty start ("empty but ready"):** a brand-new account begins with **zero people but
  the 6 built-in templates preloaded** (templates are reusable scaffolding, not personal
  data). The demo (`local`) build keeps seeding the full sample data.
- **Connectivity:** online-first. Persistence becomes **asynchronous** (Supabase is a
  network call), which introduces a minimal load-gate + save-error handling (see below).
- **Robustness:** a small load-boundary sanitizer closes the deferred NaN-guard findings.

## Architecture

### 1. Database — one table + Row Level Security

Table `app_data`:
- `owner uuid primary key references auth.users(id) on delete cascade`
- `data jsonb not null` — the entire `AppData` blob
- `updated_at timestamptz not null default now()`

RLS enabled, with policies that allow `select / insert / update / delete` **only** where
`auth.uid() = owner`. This is the security boundary: a user can touch only their own row.

Shipped as a committed SQL setup script (`supabase/schema.sql`) — this same script
becomes the self-host setup artifact in 2c.

### 2. The adapter + the sync→async change (the real work of 2a)

Today persistence is **synchronous**: `StoragePort.get()` returns a string immediately and
`useAppState` initializes state synchronously (`useState(() => store.load())`). Supabase is
**asynchronous**. So 2a makes the load/save path async:

- **`Store.load()` becomes async** (returns `Promise<AppData>`). The `local` store resolves
  immediately (localStorage is instant); the `supabase` store awaits a network read.
- **`useAppState` becomes effect-based:** it starts in a `loading` status, calls the async
  load on mount, then moves to `ready` (or `error`). Mutations stay snappy via an
  **optimistic** update — `setData(next)` immediately, then an async `save(next)` in the
  background; if the save fails, surface a non-destructive error (data stays in memory,
  retry possible) rather than losing it silently.
- **The pure `reducers` and all four screens' logic are untouched.** Only the hook and a
  top-level loading gate change. The *polished* per-screen loading/error UX is Phase 3;
  2a adds only the minimal gate + save-error surface that remote data makes unavoidable.

`supabasePort` (new) implements the storage operations against the user's row using an
authenticated Supabase client singleton:
- read → `select data from app_data where owner = auth.uid()` (returns `null` if no row)
- write → `upsert` the row
- remove → `delete` the row

### 3. Build-flag split

`VITE_BACKEND = "local" | "supabase"`, read at build time, selects:
- `local` (demo): today's behavior exactly — localStorage, **full sample seed** on empty.
- `supabase` (app): the `supabasePort` + Supabase client, and on an empty account,
  bootstrap the **empty-but-ready** state (zero people, 6 templates).

Bootstrap: extract `emptyData()` (`{ version: 2, people: [], templates: TEMPLATES }`)
alongside the existing `seedData()` in `seed.ts` (export the shared `TEMPLATES`). The
mode decides which bootstrap runs when storage is empty.

### 4. Load-boundary sanitizer (closes deferred findings)

On load, in both modes, run a small `normalize` pass over each person: backfill any
missing `coverage` area keys to `0`, and clamp `cadenceDays` to `>= 1`. This cheaply
prevents the `NaN`/divide-by-zero issues the Phase 1 review deferred — without pulling in
a full schema library. (Zod-style validation remains a heavier option for later.)

### 5. Auth boundary (what 2a assumes vs. defers)

2a builds and tests the adapter **assuming a logged-in Supabase session exists**. The
Supabase client reads its URL + anon key from env (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) — **only the public anon key is ever bundled; never the
service-role key.** The sign-up / login / logout UI and session gating are **2b**, so the
`supabase` build is not yet human-usable after 2a — that's expected for a foundation
piece, and is why 2a is validated by unit tests plus a documented manual check against a
real Supabase project with a test session.

## Data flow & error handling

- App start (supabase build): `loading` gate → async fetch the user's row → `ready`, or a
  retryable `error` state if the fetch fails.
- New account (no row yet): bootstrap `emptyData()` in memory; first save creates the row.
- Mutation: optimistic in-memory update, background save; save failure surfaces a
  non-destructive, retryable error — **never silent data loss**.

## Testing

- **Fake Supabase client** (in-memory) implementing only the small surface the adapter
  uses; unit-test `supabasePort`: read returns the stored blob, read-with-no-row → null,
  write upserts, remove deletes.
- **Bootstrap tests:** empty `local` → full seed (6 people); empty `supabase` →
  empty-but-ready (0 people, 6 templates).
- **Sanitizer tests:** a person missing a coverage key → backfilled to 0; `cadenceDays: 0`
  → clamped to 1; `coverageScore`/`cadenceStatus` no longer produce `NaN`/`Infinity`.
- The existing **58 tests stay green** and the **demo build behavior is unchanged**
  (CI runs both `VITE_BACKEND` modes' build).

## File structure

| File | Responsibility | Change |
|---|---|---|
| `supabase/schema.sql` | Table + RLS setup script | Create |
| `src/storage/supabaseClient.ts` | Supabase client singleton from env | Create |
| `src/storage/supabasePort.ts` | Async adapter (read/write/remove user row) | Create |
| `src/storage/store.ts` | Async `load`; mode-aware bootstrap + sanitizer | Modify |
| `src/storage/seed.ts` | Export `TEMPLATES` + add `emptyData()` | Modify |
| `src/state/useAppState.ts` | Effect-based async load; optimistic save + error status | Modify |
| `src/domain/normalize.ts` (or in `store.ts`) | Person sanitizer (coverage/cadence) | Create/Modify |
| tests | adapter, bootstrap, sanitizer | Create |

New dependency: `@supabase/supabase-js`.

## Non-goals (explicitly out of 2a)

- **Login / sign-up / logout UI and session gating** → 2b.
- **`.env` docs, deploy target, font self-hosting, setup-script-as-self-host-guide** → 2c.
- **Polished per-screen loading/error/empty-state UX** → Phase 3.
- **Teams / sharing / offline sync** → deferred (parent spec).

## Open questions for implementation-planning

- Exact async `Store` interface: make `load()` uniformly async, vs. keep a sync `load()`
  for `local` and add `loadAsync()` for `supabase`. (Recommend: uniformly async, one path —
  the demo's loading flash is a single render tick.)
- Where the sanitizer lives (`store.ts` vs. a dedicated `normalize.ts`).
- Pinned `@supabase/supabase-js` version.

## Risks & mitigations

- **sync→async ripples into `useAppState`.** Mitigation: reducers stay pure; only the hook
  + a loading gate change; demo behavior covered by existing tests + CI on both modes.
- **RLS correctness (a leak would expose another user's notes).** Mitigation: unit-test the
  query construction; document a manual integration check that a user cannot read another
  owner's row. (Low blast radius in single-user-per-account, but it is *the* control.)
- **Service-role key leaking into the bundle.** Mitigation: only the anon key is read from
  env; a check that the service key is never imported in `src/`.
