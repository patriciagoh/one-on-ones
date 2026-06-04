# Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Privacy-scrubbed, opt-in operational observability — Sentry error monitoring + Vercel performance insights — that sends zero user content and is off by default.

**Architecture:** A single `src/observability/sentry.ts` owns all telemetry. Sentry is **dynamically imported** and only initialized when `VITE_SENTRY_DSN` is set (so the demo bundle never ships it). A pure `scrubEvent` strips any user content; safe context travels as Sentry **tags** (the scrubber drops `extra`). A custom React error boundary reports render crashes via `captureError`. Vercel insights render only when `VITE_VERCEL_INSIGHTS=1`.

**Tech Stack:** `@sentry/react`, `@vercel/speed-insights`, `@vercel/analytics`, Vitest.

**Source spec:** `docs/superpowers/specs/2026-06-04-observability-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/observability/sentry.ts` | `scrubEvent`, `initObservability`, `captureError`, `isObservabilityActive` | Create |
| `src/observability/sentry.test.ts` | scrubber + off-by-default + no-op tests | Create |
| `src/vite-env.d.ts` | declare `VITE_SENTRY_DSN`, `VITE_VERCEL_INSIGHTS` | Modify |
| `src/main.tsx` | call `initObservability()` before render | Modify |
| `src/ui/ErrorBoundary.tsx` | custom boundary → `captureError` + fallback | Create |
| `src/ui/App.tsx` | wrap app in boundary; gated Vercel insights | Modify |
| `src/state/useAppState.ts` | route load/save catches through `captureError` | Modify |
| `.env.example` | document the two optional vars | Modify |
| `README.md` | honest telemetry wording | Modify |
| `package.json` | add the three packages | Modify |

---

## Task 1: Observability module (scrubber + gated init + capture)

**Files:** Create `src/observability/sentry.ts`, `src/observability/sentry.test.ts`; Modify `src/vite-env.d.ts`, `package.json`

- [ ] **Step 1: Install Sentry**

Run: `npm install @sentry/react`
Expected: added to `dependencies`. (CSS/JS only; `.npmrc` ignore-scripts unaffected.)

- [ ] **Step 2: Add the env vars to the typed env** — in `src/vite-env.d.ts`, add to `ImportMetaEnv`:

```ts
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_VERCEL_INSIGHTS?: string;
```

- [ ] **Step 3: Write the failing tests** — create `src/observability/sentry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scrubEvent, initObservability, captureError, isObservabilityActive } from "./sentry";

describe("scrubEvent", () => {
  it("strips request bodies, breadcrumb data, and extra", () => {
    const event = {
      message: "boom",
      request: { url: "/x", data: { people: [{ name: "Maya" }] } },
      breadcrumbs: [{ category: "fetch", data: { body: "secret" } }],
      extra: { appData: { people: [] } },
    };
    const out = scrubEvent({ ...event }) as typeof event;
    expect(out.request.data).toBeUndefined();
    expect(out.breadcrumbs[0].data).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.request.url).toBe("/x"); // non-sensitive fields kept
  });

  it("leaves a clean event intact", () => {
    const out = scrubEvent({ message: "boom", level: "error" }) as { message: string; level: string };
    expect(out.message).toBe("boom");
    expect(out.level).toBe("error");
  });
});

describe("initObservability (off by default)", () => {
  it("does not activate without VITE_SENTRY_DSN", async () => {
    await initObservability();
    expect(isObservabilityActive()).toBe(false);
  });
  it("captureError is a no-op (no throw) when inactive", () => {
    expect(() => captureError(new Error("x"), { op: "save" })).not.toThrow();
  });
});
```

- [ ] **Step 4: Run — verify fail**

Run: `npm test -- src/observability/sentry.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 5: Implement `src/observability/sentry.ts`**

```ts
/** A structural subset of a Sentry event — enough to scrub it without importing
 *  the SDK (keeps this module testable + free of a static @sentry dependency). */
export interface ScrubbableEvent {
  request?: { data?: unknown; [k: string]: unknown };
  breadcrumbs?: Array<{ data?: unknown; [k: string]: unknown }>;
  extra?: Record<string, unknown>;
  [k: string]: unknown;
}

/** Remove anything that could carry user content before an event leaves the browser.
 *  Pure-ish: mutates and returns the event (Sentry's beforeSend contract). */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) delete event.request.data;
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(({ data: _drop, ...rest }) => rest);
  }
  if (event.extra) delete event.extra;
  return event;
}

type SafeContext = Record<string, string | number | boolean>;

let sentry: typeof import("@sentry/react") | null = null;
let active = false;

export function isObservabilityActive(): boolean {
  return active;
}

/** Initializes Sentry ONLY if a DSN is configured (off by default). Dynamically
 *  imports the SDK so builds without a DSN (the demo) never ship it. */
export async function initObservability(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || active) return;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [], // no Session Replay / no content-capturing integrations
    tracesSampleRate: 0, // performance is Vercel's job; Sentry = errors only
    beforeSend: (event) => scrubEvent(event as ScrubbableEvent) as typeof event,
    beforeBreadcrumb: (crumb) => {
      if (crumb.data) crumb.data = undefined;
      return crumb;
    },
  });
  sentry = Sentry;
  active = true;
}

/** Report an error with optional SAFE context (sent as tags — never `extra`,
 *  which the scrubber drops). No-op until/unless observability is active. */
export function captureError(err: unknown, context?: SafeContext): void {
  if (!sentry) return;
  sentry.captureException(err, context ? { tags: context } : undefined);
}
```

- [ ] **Step 6: Run — verify pass + full suite + typecheck**

Run: `npm test -- src/observability/sentry.test.ts && npm test && npm run typecheck`
Expected: new tests pass; full suite green (101 + new); typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/observability/sentry.ts src/observability/sentry.test.ts src/vite-env.d.ts package.json package-lock.json
git commit -m "feat(observability): privacy-scrubbed, DSN-gated Sentry module"
```

---

## Task 2: Init at startup + error boundary

**Files:** Modify `src/main.tsx`; Create `src/ui/ErrorBoundary.tsx`; Modify `src/ui/App.tsx`

- [ ] **Step 1: Call `initObservability()` in `main.tsx`.** The current file renders the app; add the import and call it before render (fire-and-forget — it's async and self-gates):

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { initObservability } from "./observability/sentry";
import "./index.css";

void initObservability();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create `src/ui/ErrorBoundary.tsx`** (custom; reports via `captureError`, shows a token-styled fallback):

```tsx
import { Component, type ReactNode } from "react";
import { captureError } from "../observability/sentry";

interface Props { children: ReactNode }
interface State { crashed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: unknown): void {
    captureError(error, { boundary: "app" });
  }

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return (
      <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans">
        <div className="text-center">
          <p>Something went wrong.</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-3 px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
```

- [ ] **Step 3: Wrap the app in the boundary** — in `src/ui/App.tsx`, import it and wrap the top-level `App` return. Change the `export function App()` body so its returned tree is wrapped:

```tsx
import { ErrorBoundary } from "./ErrorBoundary";
// ...
export function App() {
  return (
    <ErrorBoundary>
      {!authPort ? <AuthedApp /> : <SupabaseAuthGate />}
    </ErrorBoundary>
  );
}
```
(Adjust to the real current `App()` body — it currently does `if (!authPort) return <AuthedApp/>; return <SupabaseAuthGate/>;`. Move that into the `ErrorBoundary` wrapper as shown.)

- [ ] **Step 4: Verify (both builds)**

Run:
```bash
npm test && npm run typecheck && npm run lint:tokens
VITE_BACKEND=local npm run build && VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: green; both builds succeed. Confirm the **local** build does NOT bundle Sentry: `grep -rl "@sentry" dist/assets/*.js` should be empty for a `VITE_BACKEND=local` build with no DSN (Sentry is dynamically imported and only fetched when a DSN exists; with no DSN at runtime the chunk is never requested — and since `initObservability` early-returns, confirm via the gated dynamic import). If Sentry code appears in a separate chunk that's fine as long as it's not in the main bundle and not loaded without a DSN; note the result.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/ui/ErrorBoundary.tsx src/ui/App.tsx
git commit -m "feat(observability): init at startup + error boundary reporting"
```

---

## Task 3: Capture save/load failures

**Files:** Modify `src/state/useAppState.ts`

- [ ] **Step 1: Import and wire `captureError`.** Add the import:

```ts
import { captureError } from "../observability/sentry";
```

In the load `useEffect`, change the catch to also report:

```ts
      .catch((err) => { if (alive) setStatus("error"); captureError(err, { op: "load" }); });
```

In `apply`, change the save catch:

```ts
      store.save(next).catch((err) => { setSaveError(true); captureError(err, { op: "save" }); });
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run typecheck`
Expected: green (101 + Task 1's tests). `captureError` is a no-op in tests (no DSN), so behavior is unchanged; this just adds reporting in production.

- [ ] **Step 3: Commit**

```bash
git add src/state/useAppState.ts
git commit -m "feat(observability): report Supabase load/save failures (no data attached)"
```

---

## Task 4: Vercel performance insights (gated)

**Files:** Modify `package.json`, `src/ui/App.tsx`

- [ ] **Step 1: Install**

Run: `npm install @vercel/speed-insights @vercel/analytics`
Expected: added to `dependencies`.

- [ ] **Step 2: Render them gated in `App.tsx`.** Add imports and a flag, render inside the top-level `App` tree (they're invisible components):

```tsx
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const insightsOn = import.meta.env.VITE_VERCEL_INSIGHTS === "1";
```

Then in `App()`'s returned tree (inside the `ErrorBoundary`), add the two components after the app content:

```tsx
export function App() {
  return (
    <ErrorBoundary>
      {!authPort ? <AuthedApp /> : <SupabaseAuthGate />}
      {insightsOn && <SpeedInsights />}
      {insightsOn && <Analytics />}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Verify (both builds)**

Run:
```bash
npm test && npm run typecheck && npm run lint:tokens
VITE_BACKEND=local npm run build && VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: green; both builds succeed. (Insights only emit when `VITE_VERCEL_INSIGHTS=1`, which only the Vercel deploy sets.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/ui/App.tsx
git commit -m "feat(observability): gated Vercel speed insights + analytics"
```

---

## Task 5: `.env.example` + README transparency

**Files:** Modify `.env.example`, `README.md`

- [ ] **Step 1: Document the optional vars in `.env.example`** — append:

```
# --- Optional observability (off unless set) ---
# Sentry error monitoring (PII-scrubbed, no session replay). Set to your project DSN.
# VITE_SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz
# Vercel privacy-friendly perf insights (set to 1 on a Vercel deploy).
# VITE_VERCEL_INSIGHTS=1
```

- [ ] **Step 2: Make the README's telemetry wording honest.** Find the Privacy note (it currently says fonts are self-hosted / the app is self-contained) and replace/extend it with:

```markdown
## Privacy & telemetry

No analytics, no tracking, no cookies, and fonts are self-hosted — the **demo sends nothing**.
The self-hostable real-app build can *optionally* enable two operational tools, both **off by
default** and controlled by env vars:

- **Error monitoring (Sentry)** — only if you set `VITE_SENTRY_DSN`. Configured to never send
  note content: no session replay, no user identification, and event payloads are scrubbed.
- **Performance insights (Vercel)** — only if you set `VITE_VERCEL_INSIGHTS=1`. Cookieless and
  anonymous (no personal data, no consent banner needed).

Self-hosters inherit **zero telemetry** unless they explicitly opt in with their own keys.
```

- [ ] **Step 3: Verify + commit**

Run: `grep -n "Privacy & telemetry\|VITE_SENTRY_DSN" README.md .env.example`
Expected: present.

```bash
git add .env.example README.md
git commit -m "docs: document optional, off-by-default observability env vars + honest privacy note"
```

---

## Task 6 (manual, guided): Sentry project + Vercel env + uptime monitor

No repo changes — runbook the author performs; controller provides values.

- [ ] **Step 1: Sentry project.** Create a free [sentry.io](https://sentry.io) project (platform: React). Copy its **DSN** (a client ingest key — publishable, not a secret).
- [ ] **Step 2: Set Vercel env vars** (Project → Settings → Environment Variables, Production):
  - `VITE_SENTRY_DSN` = the DSN from Step 1
  - `VITE_VERCEL_INSIGHTS` = `1`
  Then redeploy (or push to `main`).
- [ ] **Step 3: Verify errors flow.** On the live Vercel app, trigger a harmless error (or check Sentry's "first event" wizard); confirm it appears in Sentry **with no note content / no user identity** in the payload.
- [ ] **Step 4: Verify perf.** In Vercel → your project → Speed Insights / Analytics, confirm data starts appearing after a few visits.
- [ ] **Step 5: Uptime monitor.** Create a free [UptimeRobot](https://uptimerobot.com) (or Better Stack) monitor for the Vercel URL (and optionally the Pages URL), HTTP(s), 5-min interval, email alert on down.

---

## Done criteria

- [ ] `scrubEvent` strips request bodies/breadcrumb data/extra (unit-tested); a clean event passes through.
- [ ] Sentry **does not initialize without `VITE_SENTRY_DSN`** (unit-tested); `captureError` no-ops when inactive.
- [ ] Sentry loaded via dynamic import → not shipped in the demo bundle.
- [ ] Error boundary reports render crashes (no data) and shows a graceful fallback.
- [ ] Load/save failures report through `captureError` with only `{ op }` context.
- [ ] Vercel insights render only when `VITE_VERCEL_INSIGHTS=1`.
- [ ] README privacy wording honest; `.env.example` documents both optional vars.
- [ ] `npm test && npm run typecheck && npm run lint:tokens` green; both builds compile.
- [ ] (manual) Author's Sentry receives a scrubbed test event; Vercel insights live; uptime monitor active.
