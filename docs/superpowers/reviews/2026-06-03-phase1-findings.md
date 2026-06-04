# Phase 1 Review Findings — 2026-06-03

Sources: a whole-app code-quality/correctness review and a security review (both
read-only) of `one-on-ones` on branch `supabase-self-host`, after the Task 1
data-loss fix and Task 2 LICENSE were merged.

**Triage rule (from the plan):** a finding is **must-fix** only if it causes
incorrect behavior, data loss, or a security hole *in the app as it exists today*.
Slop/robustness that the Phase 2 Supabase rework will touch anyway → **defer**.

Headline: **no Critical findings.** Security is clean apart from a Google Fonts
network call. Most correctness findings only manifest with real, repeated, mutating
use (Phase 2) or via code paths that don't exist yet (person creation, hand-crafted
blobs).

## Must-fix (fixing now, in this phase)

- [ ] **Action IDs collide when two meetings are saved for the same person on the
  same day** — `src/state/useAppState.ts:97`. IDs are `act-${personId}-${date}-${i}`;
  a same-day second save reuses identical IDs, and `toggleAction` (which matches by
  ID across all people) then toggles *every* action sharing that ID → silent ledger
  corruption. Reachable today via Meeting Mode → save. **Fix:** make generated action
  IDs unique (e.g. append a `crypto.randomUUID()` fragment). TDD.
- [ ] **`PrepDigest` "Start 1:1" CTA lacks a `focus-visible` ring** —
  `src/ui/PrepDigest.tsx:122`. Every other interactive element has one; this is a
  WCAG 2.2 AA (2.4.7 Focus Visible) keyboard-accessibility gap, and AA is an explicit
  project invariant. axe didn't catch it (focus styling isn't statically detectable).
  **Fix:** add the same `focus-visible:ring-*` treatment used by sibling buttons.
- [ ] **README claims "no telemetry, no network" but the prod build calls Google
  Fonts** (see security finding below). The claim is currently false. **Fix:** correct
  the README wording now; track font self-hosting as a Phase 2 pre-launch item.

## Should-fix (cheap, but deferred to keep Phase 1 tight / product decision needed)

- **`saveMeeting` never clears `person.asyncAgenda`** — `src/state/useAppState.ts:113`.
  Report-raised async items persist forever and accumulate every meeting, inflating
  `attentionScore`. Reachable today. **Deferred because it's a product-semantics
  decision** (should saving a meeting clear that meeting's agenda? probably, but the
  handoff spec should decide) — flagged to the user, not auto-fixed.
- **`raiseQueue` called twice in `ReportCard`** — `src/ui/Overview.tsx:176`. Pure
  waste (same result, sorts threads twice). Trivial dedup. Deferred — Phase 2/3 may
  rework Overview; no behavioral impact.

## Defer (tracked; fold into Phase 2 or Phase 3)

- **`cadenceStatus` divides by `p.cadenceDays`; `0` → `Infinity`/`NaN` → silent
  "cold" + inflated `attentionScore`** — `src/domain/compute.ts:34`. Not reachable
  today (seed cadences are non-zero; no person-creation UI). **→ Phase 2**: add the
  guard when person creation/editing lands.
- **`coverageScore`/`bluntestSpot` produce `NaN` if a `Person.coverage` is missing a
  key** — `src/domain/compute.ts:21,27`. Only via a partial/hand-crafted blob that
  passes the loose v2 shape check. **→ Phase 2**: handle at the Supabase deserialization
  boundary (typed schema validation, e.g. Zod/Valibot — replaces the loose `migrate`
  check), backfilling coverage.
- **Summary time split double-rounds (`durationMin*60` × integer `reportShare`)** —
  `src/ui/Summary.tsx:110`. Display-only drift; no saved-data impact. **→ Phase 2** if
  `MeetingRecord` ever stores raw seconds.
- **`fmtTime` duplicated** in `MeetingMode.tsx:61` and `Summary.tsx:24` — extract to a
  shared util. Minor slop.
- **Dead schema/output:** `Person.sentimentTrend` (`types.ts:54`) never read;
  `BlindSpot.coldCount` (`compute.ts:63`) computed but never rendered. Remove or wire
  up. Minor.
- **`raiseScore`/`attentionScore` exported only for tests** (`compute.ts:41,75`) — add
  a comment so they're not mistaken for UI API. Minor.
- **Index-as-React-key in meeting history** — `Person.tsx:486`. Use a stable key.
  Minor (matters more once meetings are editable/deletable in Phase 2).
- **Empty-state UX:** "0 people" renders a blank grid (`Overview.tsx:399`); empty
  templates section still shows a heading (`Person.tsx:456`). **→ Phase 3 (online-first
  UX)** — and note this is *more* important then, because the app build **starts
  empty**, so the 0-people state is the first thing a new user sees.
- **No CSP** (`index.html`, no header on Pages). Low risk today (no creds, no network
  beyond fonts). **→ Phase 2**: add a `<meta>` CSP for the demo and a response-header
  CSP for the self-hosted build once Supabase credentials flow through the frontend.
- **`personId` flows into route strings** — safe today (ids are app-generated, React
  Router ignores `javascript:`). **→ Phase 2**: validate id charset if ids ever become
  user-editable.

## Security finding (detail)

- **Google Fonts `@import` in the production CSS** — `matcha-oat-design-system/fonts.css`
  (imported via `src/index.css:2`), survives into `dist`. Every page load hits
  `fonts.googleapis.com`/`fonts.gstatic.com`, leaking the user's IP, geolocation, and a
  session-timing signal to Google. Medium severity given the sensitive notes the app
  handles. The README "no network" claim corrected now (must-fix above); **self-hosting
  the fonts is a Phase 2 pre-launch item** (the design system already exposes the token
  layer cleanly, and `fonts.css` documents the `@font-face` swap — but it touches the
  shared design-system integration, so it belongs with the Phase 2 build work, not a
  Phase 1 hotfix).
- Clean: no XSS/`dangerouslySetInnerHTML`/`eval`, no secrets/API keys, no
  analytics/telemetry, `JSON.parse` guarded, no prototype-pollution path, `npm audit
  --omit=dev` = 0, GitHub Actions workflow minimal-permission and clean.

## Won't-fix

- None.
