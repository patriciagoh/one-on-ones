# Manage Reports (Add / Edit / Delete) — Design Spec

**Date:** 2026-06-04
**Status:** Draft — awaiting user review
**Type:** App feature — CRUD for the central `Person` ("report") entity, plus a richer profile. Built on top of the Supabase backend (2a) + auth (2b).
**Branch:** `phase2a-backend-foundation` (stacks on 2a + 2b; all merge together as the first usable real-app release)

## Purpose

The Supabase app build starts empty (no seed), but there is currently **no way to create a
report** — the original app only ran on seeded fake people. This makes the real app unusable
and blocks the end-to-end write-path validation. This feature adds **add / edit / delete** for
reports, with a richer descriptive profile, so a manager can actually manage their team.

## Locked decisions (from brainstorming)

- **Full CRUD:** add, edit, delete a report (not just add).
- **Richer profile, descriptive-only:** new fields are recorded + displayed, none change app
  logic (yet).
- **Tenure is computed from a join date** (no manual monthly updates).
- **Real dates in the real app:** the Supabase build uses the actual current date; the demo
  stays frozen at `2026-06-04`.
- **Full routes, not modals** (matching the existing MeetingMode a11y choice).
- **Add + edit share one form component.**
- Only the **profile** is add/edit/delete-able here — meeting/thread/action *history* is
  managed where it already is.

## Data model

Add to `Person` (all **optional**, so existing/empty data stays valid via `normalizeAppData`):

| Field | Type | Notes |
|---|---|---|
| `seniority` | `string` | free text (e.g. "Senior", "Staff") |
| `team` | `string` | free text |
| `location` | `string` | free text |
| `timezone` | `string` | IANA tz (e.g. `America/Toronto`); autofilled at create |
| `onCall` | `boolean` | yes/no |
| `joinedDate` | `ISO \| null` | the date they joined; source of truth for tenure |

`normalizeAppData` defaults: strings → `""`, `onCall` → `false`, `joinedDate` → `null`. The
legacy `tenureMonths` field is **kept** for demo-seed back-compat.

### Computed tenure

A pure helper in `src/domain/time.ts`: `tenureMonths(joinedDate: ISO | null, now: ISO): number`
and a `tenureLabel(...)` returning a friendly string (e.g. `"1y 4m"`, `"3m"`, `"<1m"`). The
Profile display prefers the computed value when `joinedDate` is set, else falls back to the
legacy static `person.tenureMonths` (demo seed). Pure + `now`-parameterized, consistent with
the existing domain functions.

### Current-date source

Today the app uses a frozen `NOW = "2026-06-04"` (deliberate, so the seeded **demo** doesn't
drift). Change `App.tsx` so:
- **Supabase build** → `NOW` = the actual today (`new Date().toISOString().slice(0,10)`).
- **Demo build** → unchanged frozen `"2026-06-04"`.

Consequence (desirable for real use): in the real app, cadence status, "overdue," coverage
staleness, and tenure are all live relative to real today. The demo is unaffected.

## Routes (full screens)

- `/new` — add a report.
- `/person/:id/edit` — edit that report; **delete lives here** (a "Delete report" control →
  inline two-step confirm → `removePerson` → navigate to Overview).
- Both reachable from: an **"Add report"** button on Overview (prominent in the empty state,
  a header action when populated) and an **"Edit"** affordance on the Person screen.

If `/person/:id/edit` is hit for an unknown id, show the existing not-found treatment (the
Person screen already handles not-found).

## Components

| Unit | Responsibility |
|---|---|
| `ReportForm` | shared controlled form; `mode: "add" \| "edit"`, optional initial `Person`, `onSubmit(fields)`. Fields: Name (required), Cadence (Weekly/2wk/3wk/Monthly → `cadenceDays` 7/14/21/30), Seniority, Team, Location, Timezone (autofilled via `Intl.DateTimeFormat().resolvedOptions().timeZone`), On-call (toggle), Joined (date input), Pronouns. WCAG 2.2 AA: labeled inputs, focus-to-first-field, visible focus rings, blank-name validation with `aria` error. |
| `NewReportScreen` (`/new`) | renders `ReportForm` in add mode; on submit → `addPerson` → navigate to the new person |
| `EditReportScreen` (`/person/:id/edit`) | renders `ReportForm` pre-filled; on submit → `updatePerson`; hosts Delete (confirm → `removePerson` → Overview) |
| Person screen | a **Profile** block (seniority · team · location · timezone · on-call · computed tenure) + an "Edit" link |
| Overview | "Add report" button (prominent empty-state CTA; header action otherwise) |

## Reducers (pure; persisted through the existing `useAppState` save path)

- `addPerson(data, input): AppData` — appends a new `Person`. Generates `id`
  (`p-<slug>-<random>`), derives `initials` from the name, assigns a deterministic `hue`
  (hash of name), empty history (`threads/actions/asyncAgenda/meetings/talkTrend/sentimentTrend`
  = `[]`), `coverage` all `0`, `lastOneOnOne`/`nextScheduled` = `null`. Sets the profile fields
  from input.
- `updatePerson(data, id, input): AppData` — patches the editable **profile** fields
  (name, pronouns, cadenceDays, seniority, team, location, timezone, onCall, joinedDate);
  recomputes `initials` from the (possibly new) name; **keeps `hue` stable** (avatar color
  shouldn't jump); leaves all history untouched.
- `removePerson(data, id): AppData` — removes the person with that id.

`input` is a single `ReportFields` type shared by add/edit (the form's output), keeping the
form and reducers in sync.

## Data flow & error handling

- Add: fill form → `addPerson` → optimistic state update + Supabase save (2a path) → navigate
  to the new person. This is also what finally exercises the **write path** live.
- Edit: pre-filled form → `updatePerson` → save → back to the person.
- Delete: inline confirm → `removePerson` → save → Overview.
- Blank name blocks submit with a visible, `aria`-announced error.
- Save failures surface via the existing `saveError` path (no silent loss).

## Testing

- **Reducers (node):** `addPerson` (correct defaults, initials derived, ids unique across two
  adds, profile fields set); `updatePerson` (patches only profile fields, history preserved,
  initials recomputed, hue stable, unknown id is a no-op); `removePerson` (removes target,
  others intact, unknown id no-op).
- **Tenure helper (node):** `tenureMonths`/`tenureLabel` from a join date + `now` (e.g. joined
  16 months ago → "1y 4m"; <1 month → "<1m"; null → falls back to legacy).
- **`ReportForm` (happy-dom):** add mode submits the entered fields; edit mode pre-fills and
  submits changes; blank name is blocked; timezone autofills; axe clean.
- **Profile block (happy-dom):** renders the fields + computed tenure.
- Existing tests + **demo build behavior stay green** (frozen NOW preserved for demo).

## File structure

| File | Change |
|---|---|
| `src/domain/types.ts` | add optional `Person` profile fields + a `ReportFields` type |
| `src/domain/normalize.ts` | default the new fields |
| `src/domain/time.ts` | `tenureMonths` / `tenureLabel` helpers |
| `src/state/useAppState.ts` | `addPerson` / `updatePerson` / `removePerson` reducers + hook wrappers |
| `src/ui/ReportForm.tsx` | shared add/edit form |
| `src/ui/NewReportScreen.tsx` | `/new` |
| `src/ui/EditReportScreen.tsx` | `/person/:id/edit` + delete |
| `src/ui/Person.tsx` | Profile block + Edit link |
| `src/ui/Overview.tsx` | "Add report" button / empty-state CTA |
| `src/ui/App.tsx` | new routes; real-vs-frozen `NOW` |
| matching `*.test.ts(x)` | as above |

## Non-goals

- Editing meeting/thread/action **history** through these screens (managed where it already is).
- New fields driving any **behavior/logic** (descriptive-only; behavior is a future phase).
- Bulk import, CSV, avatars/photos, multi-select.

## Open questions for implementation-planning

- Seniority as free text vs a fixed select (recommend free text for v1 flexibility).
- Exact `hue` hash + `initials` derivation (1–2 initials from name words).
- Delete confirm as inline two-step vs a small confirm dialog (recommend inline two-step — no
  modal, consistent with the route-not-modal choice).

## Risks & mitigations

- **`updatePerson` clobbering history.** Mitigation: it patches an explicit allow-list of
  profile fields via spread; a test asserts meetings/threads survive an edit.
- **Live `NOW` destabilizing the demo.** Mitigation: real date only in the supabase build;
  demo stays frozen; both build modes covered by tests/CI.
- **Tenure off-by-one / negative (future join date).** Mitigation: helper clamps to `≥ 0`;
  tested.
