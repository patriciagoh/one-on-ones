# Phase 2a — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase as a cloud store for the app's data — one JSON document per user, behind the existing storage seam — selectable via a build flag, without building login UI yet.

**Architecture:** Keep the existing synchronous `Store` (localStorage) untouched so all current tests stay green. Add a thin **async `AppStore`** layer the React hook consumes, with two implementations: `localAppStore` (wraps the sync store) and `supabaseAppStore` (talks to Supabase). Isolate the hard-to-unit-test Supabase I/O behind a tiny **`RowStore`** seam so the adapter *logic* (bootstrap-empty, sanitize, save) is fully testable against an in-memory fake. A `VITE_BACKEND` flag picks the implementation at build time.

**Tech Stack:** React + TS + Vite + Vitest, `@supabase/supabase-js` (new).

**Source spec:** `docs/superpowers/specs/2026-06-03-phase2a-backend-foundation-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/domain/normalize.ts` | Pure sanitizer: backfill coverage keys, clamp cadenceDays | Create |
| `src/domain/normalize.test.ts` | Sanitizer tests | Create |
| `src/storage/seed.ts` | Export `TEMPLATES`; add `emptyData()` | Modify |
| `src/storage/store.ts` | Apply `normalize` on load | Modify |
| `src/storage/appStore.ts` | Async `AppStore` interface + `localAppStore` wrapper | Create |
| `src/storage/appStore.test.ts` | `localAppStore` + `supabaseAppStore` logic tests | Create |
| `src/storage/supabaseAppStore.ts` | `RowStore` interface + `supabaseAppStore` (testable logic) | Create |
| `src/storage/supabaseClient.ts` | Supabase client singleton + `supabaseRowStore` (thin I/O) | Create |
| `src/state/useAppState.ts` | Async-aware: loading/ready/error status, optimistic save | Modify |
| `src/ui/App.tsx` | Pick store by `VITE_BACKEND`; render loading/error gate | Modify |
| `supabase/schema.sql` | Table + RLS setup script | Create |
| `.env.example` | Documents the two `VITE_SUPABASE_*` vars + `VITE_BACKEND` | Create |
| `.github/workflows/*` | Build both `VITE_BACKEND` modes in CI | Modify |

---

## Task 1: Load-boundary sanitizer (`normalize`)

Closes the deferred NaN findings: a person missing a `coverage` key, or with `cadenceDays` 0, currently produces `NaN`/`Infinity` downstream.

**Files:**
- Create: `src/domain/normalize.ts`
- Create: `src/domain/normalize.test.ts`
- Modify: `src/storage/store.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/normalize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeAppData } from "./normalize";
import { AREA_KEYS } from "./types";
import { seedData } from "../storage/seed";

describe("normalizeAppData", () => {
  it("backfills missing coverage keys to 0", () => {
    const data = seedData();
    // delete one coverage key from the first person
    delete (data.people[0].coverage as Record<string, number>)[AREA_KEYS[2]];
    const out = normalizeAppData(data);
    for (const k of AREA_KEYS) {
      expect(typeof out.people[0].coverage[k]).toBe("number");
    }
    expect(out.people[0].coverage[AREA_KEYS[2]]).toBe(0);
  });

  it("clamps cadenceDays below 1 up to 1", () => {
    const data = seedData();
    data.people[0].cadenceDays = 0;
    const out = normalizeAppData(data);
    expect(out.people[0].cadenceDays).toBe(1);
  });

  it("leaves already-valid data unchanged in value", () => {
    const data = seedData();
    const out = normalizeAppData(data);
    expect(out.people.length).toBe(data.people.length);
    expect(out.people[0].cadenceDays).toBe(data.people[0].cadenceDays);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/domain/normalize.test.ts`
Expected: FAIL — `normalizeAppData` does not exist.

- [ ] **Step 3: Implement `normalize.ts`**

Create `src/domain/normalize.ts`:

```ts
import type { AppData, AreaKey } from "./types";
import { AREA_KEYS } from "./types";

/**
 * Defensive sanitizer applied when data is loaded from any store. Guarantees
 * every person has all six coverage keys and a cadenceDays >= 1, so the pure
 * compute functions never divide by zero or hit undefined coverage. Pure:
 * returns a new object graph, does not mutate the input.
 */
export function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    people: data.people.map((p) => {
      const coverage = {} as Record<AreaKey, number>;
      for (const k of AREA_KEYS) {
        const v = p.coverage?.[k];
        coverage[k] = typeof v === "number" && Number.isFinite(v) ? v : 0;
      }
      return {
        ...p,
        coverage,
        cadenceDays: p.cadenceDays >= 1 ? p.cadenceDays : 1,
      };
    }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply `normalize` on load in `store.ts`**

In `src/storage/store.ts`, import it at the top:

```ts
import { normalizeAppData } from "../domain/normalize";
```

Then in `createStore().load()`, normalize the migrate result — but compute
`reseeded` from migrate's output **before** normalizing, because `normalizeAppData`
always returns a new object (comparing against it would make `reseeded` always true,
firing the backup/flush on every load). Change:

```ts
      const data = migrate(parsed);
      const reseeded = parsed !== data; // migrate returned a fresh seed
```

to:

```ts
      const migrated = migrate(parsed);
      const data = normalizeAppData(migrated);
      const reseeded = parsed !== migrated; // migrate returned a fresh seed
```

(Seed data is already valid, so normalize is a no-op on values; it only repairs bad
blobs. Add a test asserting a valid v2 blob is NOT backed up on load.)

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `npm test && npm run typecheck`
Expected: all tests green (58 existing + 3 new), typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/domain/normalize.ts src/domain/normalize.test.ts src/storage/store.ts
git commit -m "feat(storage): sanitize coverage keys + cadenceDays on load"
```

---

## Task 2: `emptyData()` and shared `TEMPLATES`

A fresh Supabase account starts "empty but ready": zero people, the 6 built-in templates.

**Files:**
- Modify: `src/storage/seed.ts`
- Create test in: `src/storage/seed.test.ts` (new file)

- [ ] **Step 1: Write the failing test**

Create `src/storage/seed.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { emptyData, seedData } from "./seed";

describe("emptyData", () => {
  it("has no people", () => {
    expect(emptyData().people).toEqual([]);
  });
  it("includes the same templates as the full seed", () => {
    expect(emptyData().templates).toEqual(seedData().templates);
  });
  it("is schema version 2", () => {
    expect(emptyData().version).toBe(2);
  });
  it("returns an independent object each call", () => {
    const a = emptyData();
    a.people.push({} as never);
    expect(emptyData().people.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/storage/seed.test.ts`
Expected: FAIL — `emptyData` is not exported.

- [ ] **Step 3: Export `emptyData` from `seed.ts`**

In `src/storage/seed.ts`, at the bottom (next to `seedData`), add:

```ts
/** A fresh account: no people, but the built-in templates preloaded. */
export function emptyData(): AppData {
  return structuredClone({ version: 2, people: [], templates: TEMPLATES });
}
```

(`TEMPLATES` is already a module-level const in this file; no need to re-export it — both `seedData` and `emptyData` close over it.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/storage/seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/seed.ts src/storage/seed.test.ts
git commit -m "feat(storage): add emptyData() for empty-but-ready accounts"
```

---

## Task 3: Async `AppStore` interface + `localAppStore`

A thin async layer the hook will consume. The local implementation just wraps the existing sync `Store`.

**Files:**
- Create: `src/storage/appStore.ts`
- Create: `src/storage/appStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/storage/appStore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { localAppStore } from "./appStore";
import { createStore, type StoragePort } from "./store";

function memoryPort(initial?: string): StoragePort {
  let v = initial ?? null;
  return { get: () => v, set: (s) => { v = s; }, remove: () => { v = null; } };
}

describe("localAppStore", () => {
  it("load() resolves the seeded data", async () => {
    const store = localAppStore(createStore(memoryPort()));
    const data = await store.load();
    expect(data.people.length).toBe(6);
  });

  it("save() persists across reloads", async () => {
    const port = memoryPort();
    const store = localAppStore(createStore(port));
    const data = await store.load();
    data.people[0].name = "Renamed";
    await store.save(data);
    const reloaded = await localAppStore(createStore(port)).load();
    expect(reloaded.people[0].name).toBe("Renamed");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/storage/appStore.test.ts`
Expected: FAIL — `localAppStore` does not exist.

- [ ] **Step 3: Implement `appStore.ts`**

Create `src/storage/appStore.ts`:

```ts
import type { AppData } from "../domain/types";
import type { Store } from "./store";

/**
 * Async persistence interface the React hook consumes. localStorage and
 * Supabase both implement it; the async shape lets the same hook drive both.
 */
export interface AppStore {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  reset(): Promise<void>;
}

/** Wraps the synchronous localStorage-backed Store in the async interface. */
export function localAppStore(store: Store): AppStore {
  return {
    load: async () => store.load(),
    save: async (data) => store.save(data),
    reset: async () => store.reset(),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/storage/appStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/appStore.ts src/storage/appStore.test.ts
git commit -m "feat(storage): async AppStore interface + localAppStore wrapper"
```

---

## Task 4: `supabaseAppStore` logic (tested against a fake `RowStore`)

The testable core of the Supabase path: bootstrap empty accounts, sanitize, save. All Supabase network I/O is behind the `RowStore` seam (implemented for real in Task 5).

**Files:**
- Create: `src/storage/supabaseAppStore.ts`
- Modify: `src/storage/appStore.test.ts` (add a describe block)

- [ ] **Step 1: Write the failing test**

Append to `src/storage/appStore.test.ts`:

```ts
import { supabaseAppStore, type RowStore } from "./supabaseAppStore";
import { emptyData } from "./seed";
import { AREA_KEYS } from "../domain/types";

function fakeRowStore(initial?: unknown): RowStore {
  let row: unknown = initial ?? null;
  return {
    read: async () => row,
    write: async (data) => { row = data; },
    remove: async () => { row = null; },
  };
}

describe("supabaseAppStore", () => {
  it("bootstraps an empty account to empty-but-ready", async () => {
    const data = await supabaseAppStore(fakeRowStore()).load();
    expect(data.people).toEqual([]);
    expect(data.templates).toEqual(emptyData().templates);
  });

  it("returns the stored blob when a row exists", async () => {
    const stored = { version: 2, people: [], templates: [] };
    const data = await supabaseAppStore(fakeRowStore(stored)).load();
    expect(data.version).toBe(2);
  });

  it("normalizes loaded data (backfills coverage keys)", async () => {
    const person = { ...seededPerson(), coverage: {} };
    const stored = { version: 2, people: [person], templates: [] };
    const data = await supabaseAppStore(fakeRowStore(stored)).load();
    for (const k of AREA_KEYS) expect(typeof data.people[0].coverage[k]).toBe("number");
  });

  it("save() writes through to the row store", async () => {
    const rs = fakeRowStore();
    const store = supabaseAppStore(rs);
    const data = await store.load();
    data.people = [seededPerson()];
    await store.save(data);
    expect(await store.load()).toMatchObject({ people: [{ id: "p-x" }] });
  });

  it("reset() removes the row", async () => {
    const rs = fakeRowStore({ version: 2, people: [], templates: [] });
    await supabaseAppStore(rs).reset();
    const after = await supabaseAppStore(rs).load();
    expect(after.people).toEqual([]); // re-bootstrapped
  });
});

function seededPerson() {
  return {
    id: "p-x", name: "X", role: "r", pronouns: "they/them", initials: "X",
    hue: 0, tenureMonths: 1, cadenceDays: 7, lastOneOnOne: null, nextScheduled: null,
    talkTrend: [], sentimentTrend: [],
    coverage: { growth: 0, feedback: 0, workload: 0, wellbeing: 0, relationships: 0, recognition: 0 },
    threads: [], actions: [], asyncAgenda: [], meetings: [],
  };
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/storage/appStore.test.ts`
Expected: FAIL — `supabaseAppStore` / `RowStore` do not exist.

- [ ] **Step 3: Implement `supabaseAppStore.ts`**

Create `src/storage/supabaseAppStore.ts`:

```ts
import type { AppData } from "../domain/types";
import { normalizeAppData } from "../domain/normalize";
import { emptyData } from "./seed";
import type { AppStore } from "./appStore";

/**
 * Minimal persistence seam over a single per-user row. Implemented for real by
 * supabaseRowStore (Task 5); faked in tests. Keeps all network I/O out of the
 * adapter logic below so that logic is fully unit-testable.
 */
export interface RowStore {
  /** The current user's stored blob, or null if they have no row yet. */
  read(): Promise<unknown | null>;
  write(data: AppData): Promise<void>;
  remove(): Promise<void>;
}

function isAppData(v: unknown): v is AppData {
  const d = v as Partial<AppData> | null;
  return !!d && d.version === 2 && Array.isArray(d.people) && Array.isArray(d.templates);
}

/** AppStore backed by Supabase. New accounts bootstrap to empty-but-ready. */
export function supabaseAppStore(rows: RowStore): AppStore {
  return {
    load: async () => {
      const raw = await rows.read();
      return normalizeAppData(isAppData(raw) ? raw : emptyData());
    },
    save: async (data) => { await rows.write(data); },
    reset: async () => { await rows.remove(); },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/storage/appStore.test.ts`
Expected: PASS (local + supabase describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/storage/supabaseAppStore.ts src/storage/appStore.test.ts
git commit -m "feat(storage): supabaseAppStore logic with empty-account bootstrap"
```

---

## Task 5: Supabase client + real `RowStore` binding

The thin, network-touching layer. Not unit-tested (it's I/O); kept tiny and verified manually against a real project. Only the **public anon key** is read from env.

**Files:**
- Create: `src/storage/supabaseClient.ts`
- Modify: `package.json` (add dependency)

- [ ] **Step 1: Install the dependency**

Run: `npm install @supabase/supabase-js`
Expected: adds `@supabase/supabase-js` to `dependencies`.

- [ ] **Step 2: Implement `supabaseClient.ts`**

Create `src/storage/supabaseClient.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "../domain/types";
import type { RowStore } from "./supabaseAppStore";

const TABLE = "app_data";

/** Reads the public Supabase URL + anon key from build-time env. */
export function createSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  }
  return createClient(url, anonKey);
}

/** RowStore bound to the currently authenticated user's row. */
export function supabaseRowStore(client: SupabaseClient): RowStore {
  async function userId(): Promise<string> {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("Not authenticated");
    return data.user.id;
  }
  return {
    read: async () => {
      const owner = await userId();
      const { data, error } = await client
        .from(TABLE).select("data").eq("owner", owner).maybeSingle();
      if (error) throw error;
      return data?.data ?? null;
    },
    write: async (appData: AppData) => {
      const owner = await userId();
      const { error } = await client
        .from(TABLE)
        .upsert({ owner, data: appData, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    remove: async () => {
      const owner = await userId();
      const { error } = await client.from(TABLE).delete().eq("owner", owner);
      if (error) throw error;
    },
  };
}
```

- [ ] **Step 3: Typecheck + build (no unit test for I/O)**

Run: `npm run typecheck`
Expected: clean. (This module is verified by the manual integration check in Task 7, Step 5.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/storage/supabaseClient.ts
git commit -m "feat(storage): supabase client + RowStore binding (anon key only)"
```

---

## Task 6: Async-aware `useAppState` + build-flag store selection + loading gate

Wire the async store into React: a loading gate on first paint, optimistic saves, and a retryable error surface. Pick the store by `VITE_BACKEND`.

**Files:**
- Modify: `src/state/useAppState.ts`
- Modify: `src/ui/App.tsx`

> Note on testing: per the existing code comment, the hook is not unit-tested (vitest env is `node`, no DOM). We keep the pure reducers as the tested surface and verify the hook/gate via the manual run in Task 7, Step 5. No new hook unit test is added; do not fake one.

- [ ] **Step 1: Rewrite `useAppState` to be async-aware**

Replace the body of `useAppState` in `src/state/useAppState.ts`. Replace:

```ts
export function useAppState(store: Store = createStore()) {
  const [data, setData] = useState<AppData>(() => store.load());

  const apply = useCallback(
    (next: AppData) => {
      store.save(next);
      setData(next);
    },
    [store],
  );

  return useMemo(
    () => ({
      data,
      toggleAction: (id: string, now: string) =>
        apply(reducers.toggleAction(data, id, now)),
      toggleRaise: (id: string) =>
        apply(reducers.toggleRaise(data, id)),
      addAsyncItem: (pid: string, item: NewAsync, now: string, id: string) =>
        apply(reducers.addAsyncItem(data, pid, item, now, id)),
      saveMeeting: (input: SaveMeetingInput) =>
        apply(reducers.saveMeeting(data, input)),
    }),
    [data, apply],
  );
}
```

with:

```ts
import { useEffect, useState, useCallback, useMemo } from "react";
import type { AppStore } from "../storage/appStore";

export type LoadStatus = "loading" | "ready" | "error";

export function useAppState(store: AppStore) {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    store
      .load()
      .then((d) => { if (alive) { setData(d); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [store]);

  const apply = useCallback(
    (next: AppData) => {
      setData(next); // optimistic
      setSaveError(false);
      store.save(next).catch(() => setSaveError(true));
    },
    [store],
  );

  return useMemo(
    () => ({
      data,
      status,
      saveError,
      toggleAction: (id: string, now: string) =>
        data && apply(reducers.toggleAction(data, id, now)),
      toggleRaise: (id: string) =>
        data && apply(reducers.toggleRaise(data, id)),
      addAsyncItem: (pid: string, item: NewAsync, now: string, id: string) =>
        data && apply(reducers.addAsyncItem(data, pid, item, now, id)),
      saveMeeting: (input: SaveMeetingInput) =>
        data && apply(reducers.saveMeeting(data, input)),
    }),
    [data, status, saveError, apply],
  );
}
```

(Remove the now-unused `createStore`/`Store` import from this file if present; keep the `reducers` export and the `NewAsync`/`SaveMeetingInput` types unchanged.)

- [ ] **Step 2: Select the store by build flag and add the gate in `App.tsx`**

In `src/ui/App.tsx`, add near the top (after imports):

```ts
import { localAppStore } from "../storage/appStore";
import { supabaseAppStore } from "../storage/supabaseAppStore";
import { createStore } from "../storage/store";
import { createSupabaseClient, supabaseRowStore } from "../storage/supabaseClient";

const appStore =
  import.meta.env.VITE_BACKEND === "supabase"
    ? supabaseAppStore(supabaseRowStore(createSupabaseClient()))
    : localAppStore(createStore());
```

Pass `appStore` into `useAppState(appStore)` where the hook is currently called, and gate rendering on status. Wrap the existing app body so that:

```tsx
const app = useAppState(appStore);
if (app.status === "loading") return <LoadingGate />;
if (app.status === "error" || !app.data) return <LoadErrorGate />;
// ...existing render using app.data and app.* mutators...
```

Add two tiny components in `App.tsx` (match existing Tailwind tokens — no raw hex, `lint:tokens` will check):

```tsx
function LoadingGate() {
  return (
    <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans">
      <p role="status" aria-live="polite">Loading your 1:1s…</p>
    </main>
  );
}

function LoadErrorGate() {
  return (
    <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans">
      <div className="text-center">
        <p>Couldn’t load your data.</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-3 px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
```

If `App.tsx` reads `data` directly from the old sync hook in multiple places, update those references to use `app.data` (which is now guaranteed non-null past the gate). Add a `saveError` banner only if trivial; otherwise leave the richer error UX for Phase 3 (the gate + retry is sufficient for 2a).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean. Fix any spots where `data` was assumed non-null at the call site.

- [ ] **Step 4: Run the full suite + lint + both-mode build**

Run:
```bash
npm test && npm run typecheck && npm run lint:tokens
VITE_BACKEND=local npm run build
VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: 58+ tests green; both builds succeed.

- [ ] **Step 5: Commit**

```bash
git add src/state/useAppState.ts src/ui/App.tsx
git commit -m "feat(app): async-aware useAppState + build-flag store selection + loading gate"
```

---

## Task 7: Schema script, env example, CI both-mode build, manual integration check

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.example`
- Modify: the Pages workflow under `.github/workflows/`

- [ ] **Step 1: Create the SQL setup script**

Create `supabase/schema.sql`:

```sql
-- one row per user; the whole AppData blob lives in `data`.
create table if not exists public.app_data (
  owner uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "owner can read own row"   on public.app_data for select using (auth.uid() = owner);
create policy "owner can insert own row" on public.app_data for insert with check (auth.uid() = owner);
create policy "owner can update own row" on public.app_data for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "owner can delete own row" on public.app_data for delete using (auth.uid() = owner);
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example`:

```
# Build target: "local" (demo, localStorage, seeded) or "supabase" (real app).
VITE_BACKEND=local

# Only needed when VITE_BACKEND=supabase. Public values — safe to ship.
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Keep the Pages demo on the local build + add a supabase-build CI check**

Inspect the workflow under `.github/workflows/` (e.g. `deploy.yml`). Ensure the Pages build step runs the **local** build (the public demo must stay seeded/no-login):

```yaml
      - run: npm run build
        env:
          VITE_BACKEND: local
```

Add a separate CI job (or step) that proves the supabase build compiles, so the app path can't silently break:

```yaml
      - run: npm run build
        env:
          VITE_BACKEND: supabase
          VITE_SUPABASE_URL: https://example.supabase.co
          VITE_SUPABASE_ANON_KEY: ci-placeholder
```

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql .env.example .github
git commit -m "chore: supabase schema script, .env.example, CI both-mode build"
```

- [ ] **Step 5: Manual integration check (proves the real I/O works)**

This is the verification that unit tests can't give (real network + RLS). Do it once:

1. Create a free Supabase project; run `supabase/schema.sql` in its SQL editor.
2. In the project's Auth settings, create one test user (email+password).
3. Create a local `.env` with that project's URL + anon key and `VITE_BACKEND=supabase`.
4. Temporarily sign that user in (e.g. a throwaway `client.auth.signInWithPassword(...)` call in the browser console, since login UI is 2b), then run `npm run dev`.
5. Verify: the app loads empty-but-ready (0 people, 6 templates); add a person → reload → it persists; check the Supabase table shows exactly one row owned by that user.
6. Record the result (pass/fail + any notes) in the PR/commit message. Remove the throwaway sign-in.

---

## Done criteria for 2a

- [ ] `app_data` table + RLS script committed; manual check confirms a user reads/writes only their own row.
- [ ] `supabaseAppStore` logic fully unit-tested against a fake `RowStore` (bootstrap, normalize, save, reset).
- [ ] Sanitizer closes the deferred coverage/cadence NaN findings.
- [ ] `VITE_BACKEND` selects local vs supabase; demo build unchanged and still seeded.
- [ ] Loading + retry gate present; saves are optimistic with a save-error flag.
- [ ] `npm test && npm run typecheck && npm run lint:tokens` green; both-mode builds succeed in CI.
- [ ] Login UI still absent (that's 2b) — documented, not a gap.
