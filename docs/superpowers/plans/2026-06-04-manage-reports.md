# Manage Reports (Add / Edit / Delete) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a manager add, edit, and delete reports with a richer descriptive profile and a join-date-derived tenure, making the empty-start Supabase app usable.

**Architecture:** Pure reducers (`addPerson`/`updatePerson`/`removePerson`) and pure helpers (initials/hue, tenure) drive the change; a shared `ReportForm` powers two full routes (`/new`, `/person/:id/edit`); the Supabase build uses the real current date. Persistence rides the existing `useAppState`→save path (so add/edit/delete write to Supabase).

**Tech Stack:** React + TS + Vite + Vitest, `@testing-library/react` (happy-dom pragma for component tests).

**Source spec:** `docs/superpowers/specs/2026-06-04-manage-reports-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/domain/types.ts` | new optional `Person` profile fields + `ReportFields` | Modify |
| `src/domain/normalize.ts` | default the new fields | Modify |
| `src/domain/person.ts` | pure `initialsOf` + `hueOf` | Create |
| `src/domain/time.ts` | `tenureMonths` + `tenureLabel` | Modify |
| `src/state/useAppState.ts` | `addPerson`/`updatePerson`/`removePerson` reducers + hook wrappers | Modify |
| `src/ui/ReportForm.tsx` | shared add/edit form | Create |
| `src/ui/NewReportScreen.tsx` | `/new` | Create |
| `src/ui/EditReportScreen.tsx` | `/person/:id/edit` + delete | Create |
| `src/ui/Overview.tsx` | "Add report" button / empty CTA | Modify |
| `src/ui/Person.tsx` | Profile block + Edit link; computed tenure | Modify |
| `src/ui/App.tsx` | routes + real-vs-frozen `NOW` | Modify |
| matching `*.test.ts(x)` | per task | Create |

---

## Task 1: Data model — profile fields + `ReportFields`

**Files:** Modify `src/domain/types.ts`, `src/domain/normalize.ts`; Test: `src/domain/normalize.test.ts`

- [ ] **Step 1: Add fields to `Person` and a `ReportFields` type** in `src/domain/types.ts`. In the `Person` interface, add these optional fields (after `cadenceDays`):

```ts
  seniority?: string;
  team?: string;
  location?: string;
  timezone?: string;
  onCall?: boolean;
  joinedDate?: ISO | null;
```

And add a new exported type (near the bottom, after `Person`):

```ts
/** The editable profile fields captured by the add/edit ReportForm. */
export interface ReportFields {
  name: string;
  pronouns: string;
  cadenceDays: number;
  seniority: string;
  team: string;
  location: string;
  timezone: string;
  onCall: boolean;
  joinedDate: ISO | null;
}
```

- [ ] **Step 2: Write the failing normalize test** — add to `src/domain/normalize.test.ts`:

```ts
  it("defaults the new profile fields", () => {
    const data = seedData();
    const p = normalizeAppData(data).people[0];
    expect(p.seniority).toBe("");
    expect(p.team).toBe("");
    expect(p.location).toBe("");
    expect(p.timezone).toBe("");
    expect(p.onCall).toBe(false);
    expect(p.joinedDate).toBeNull();
  });
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npm test -- src/domain/normalize.test.ts`
Expected: FAIL (fields are `undefined`).

- [ ] **Step 4: Default the fields in `normalizeAppData`** — in `src/domain/normalize.ts`, inside the `people.map`, add to the returned person object (alongside `coverage`/`cadenceDays`):

```ts
        seniority: p.seniority ?? "",
        team: p.team ?? "",
        location: p.location ?? "",
        timezone: p.timezone ?? "",
        onCall: p.onCall ?? false,
        joinedDate: p.joinedDate ?? null,
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/domain/normalize.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/normalize.ts src/domain/normalize.test.ts
git commit -m "feat(model): Person profile fields + ReportFields; normalize defaults"
```

---

## Task 2: Pure helpers — initials/hue + tenure

**Files:** Create `src/domain/person.ts`, `src/domain/person.test.ts`; Modify `src/domain/time.ts`, `src/domain/time.test.ts`

- [ ] **Step 1: Write failing tests** — create `src/domain/person.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { initialsOf, hueOf } from "./person";

describe("initialsOf", () => {
  it("uses the first letters of the first two words, uppercased", () => {
    expect(initialsOf("Maya Chen")).toBe("MC");
    expect(initialsOf("maya")).toBe("M");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("hueOf", () => {
  it("is deterministic and within 0–359", () => {
    const h = hueOf("Maya Chen");
    expect(h).toBe(hueOf("Maya Chen"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});
```

And append to `src/domain/time.test.ts`:

```ts
import { tenureMonths, tenureLabel } from "./time";

describe("tenure", () => {
  it("tenureMonths counts whole months since joinedDate (clamped >= 0)", () => {
    expect(tenureMonths("2025-02-04", "2026-06-04")).toBe(16);
    expect(tenureMonths("2099-01-01", "2026-06-04")).toBe(0); // future → 0
    expect(tenureMonths(null, "2026-06-04")).toBe(0);
  });
  it("tenureLabel formats years/months, with a fallback for no joinedDate", () => {
    expect(tenureLabel("2025-02-04", "2026-06-04")).toBe("1y 4m");
    expect(tenureLabel("2026-05-20", "2026-06-04")).toBe("<1m");
    expect(tenureLabel(null, "2026-06-04", 5)).toBe("5m"); // legacy fallback
  });
});
```

(Note: `time.test.ts` already has a top-level `import { ... } from "./time"` and `describe` blocks — add the new import at the top with the others, and the new `describe` at the end.)

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/domain/person.test.ts src/domain/time.test.ts`
Expected: FAIL (functions missing).

- [ ] **Step 3: Implement `src/domain/person.ts`:**

```ts
/** First letters of the first two words, uppercased; "?" if empty. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

/** Deterministic hue (0–359) from a name, for avatar color. */
export function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}
```

- [ ] **Step 4: Implement tenure in `src/domain/time.ts`** (append):

```ts
const MS_PER_MONTH = MS_PER_DAY * 30.44;

/** Whole months between joinedDate and now, clamped to >= 0. 0 if no date. */
export function tenureMonths(joinedDate: ISO | null | undefined, now: ISO): number {
  if (!joinedDate) return 0;
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(joinedDate)) / MS_PER_MONTH));
}

/** Friendly tenure ("1y 4m" / "5m" / "<1m"). Falls back to legacy months. */
export function tenureLabel(joinedDate: ISO | null | undefined, now: ISO, fallbackMonths = 0): string {
  const m = joinedDate ? tenureMonths(joinedDate, now) : fallbackMonths;
  if (m < 1) return "<1m";
  const y = Math.floor(m / 12);
  const mm = m % 12;
  if (y && mm) return `${y}y ${mm}m`;
  return y ? `${y}y` : `${mm}m`;
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/domain/person.test.ts src/domain/time.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/domain/person.ts src/domain/person.test.ts src/domain/time.ts src/domain/time.test.ts
git commit -m "feat(domain): initialsOf/hueOf + tenureMonths/tenureLabel helpers"
```

---

## Task 3: `addPerson` reducer + hook wrapper

**Files:** Modify `src/state/useAppState.ts`, `src/state/useAppState.test.ts`

- [ ] **Step 1: Write the failing test** — add to `src/state/useAppState.test.ts`:

```ts
import type { ReportFields } from "../domain/types";

const FIELDS: ReportFields = {
  name: "Maya Chen", pronouns: "she/her", cadenceDays: 14,
  seniority: "Senior", team: "Platform", location: "Toronto",
  timezone: "America/Toronto", onCall: true, joinedDate: "2025-02-04",
};

describe("addPerson", () => {
  it("appends a person with derived id/initials and empty history", () => {
    const data = seedData();
    const before = data.people.length;
    const next = reducers.addPerson(data, FIELDS, "p-test-1");
    const p = next.people.find((x) => x.id === "p-test-1")!;
    expect(next.people.length).toBe(before + 1);
    expect(p.name).toBe("Maya Chen");
    expect(p.initials).toBe("MC");
    expect(p.cadenceDays).toBe(14);
    expect(p.seniority).toBe("Senior");
    expect(p.onCall).toBe(true);
    expect(p.joinedDate).toBe("2025-02-04");
    expect(p.meetings).toEqual([]);
    expect(p.actions).toEqual([]);
    expect(p.lastOneOnOne).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/state/useAppState.test.ts`
Expected: FAIL (`addPerson` missing).

- [ ] **Step 3: Implement `addPerson` in the `reducers` object** in `src/state/useAppState.ts`. Add the import at the top:

```ts
import { initialsOf, hueOf } from "../domain/person";
import { AREA_KEYS } from "../domain/types";
```

(merge `ReportFields` into the existing type import from `../domain/types`). Then add to `reducers`:

```ts
  addPerson(data: AppData, input: ReportFields, id: string): AppData {
    const coverage = Object.fromEntries(AREA_KEYS.map((k) => [k, 0])) as Person["coverage"];
    const person: Person = {
      id,
      name: input.name,
      role: input.seniority, // keep legacy header line populated
      pronouns: input.pronouns,
      initials: initialsOf(input.name),
      hue: hueOf(input.name),
      tenureMonths: 0,
      cadenceDays: input.cadenceDays,
      lastOneOnOne: null,
      nextScheduled: null,
      talkTrend: [],
      sentimentTrend: [],
      coverage,
      threads: [],
      actions: [],
      asyncAgenda: [],
      meetings: [],
      seniority: input.seniority,
      team: input.team,
      location: input.location,
      timezone: input.timezone,
      onCall: input.onCall,
      joinedDate: input.joinedDate,
    };
    return { ...data, people: [...data.people, person] };
  },
```

- [ ] **Step 4: Add the hook wrapper** — in the `useAppState` return object's `useMemo`, add (it returns the new id so the screen can navigate):

```ts
      addPerson: (input: ReportFields): string | undefined => {
        if (!data) return undefined;
        const id = `p-${crypto.randomUUID().slice(0, 8)}`;
        apply(reducers.addPerson(data, input, id));
        return id;
      },
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/state/useAppState.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/useAppState.ts src/state/useAppState.test.ts
git commit -m "feat(state): addPerson reducer + hook wrapper"
```

---

## Task 4: `updatePerson` + `removePerson` reducers + wrappers

**Files:** Modify `src/state/useAppState.ts`, `src/state/useAppState.test.ts`

- [ ] **Step 1: Write the failing tests** — add to `src/state/useAppState.test.ts`:

```ts
describe("updatePerson", () => {
  it("patches profile fields, recomputes initials, keeps hue + history", () => {
    const base = reducers.addPerson(seedData(), FIELDS, "p-u");
    const original = base.people.find((p) => p.id === "p-u")!;
    const edited = reducers.updatePerson(base, "p-u", { ...FIELDS, name: "Dana Ng", team: "Infra" });
    const p = edited.people.find((x) => x.id === "p-u")!;
    expect(p.name).toBe("Dana Ng");
    expect(p.initials).toBe("DN");
    expect(p.team).toBe("Infra");
    expect(p.hue).toBe(original.hue);        // hue stable
    expect(p.meetings).toBe(original.meetings); // history untouched (same ref)
  });
  it("is a no-op for an unknown id", () => {
    const data = seedData();
    expect(reducers.updatePerson(data, "nope", FIELDS)).toEqual(data);
  });
});

describe("removePerson", () => {
  it("removes the target and leaves the rest", () => {
    const data = seedData();
    const id = data.people[0].id;
    const next = reducers.removePerson(data, id);
    expect(next.people.find((p) => p.id === id)).toBeUndefined();
    expect(next.people.length).toBe(data.people.length - 1);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/state/useAppState.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement both reducers** in the `reducers` object:

```ts
  updatePerson(data: AppData, id: string, input: ReportFields): AppData {
    return {
      ...data,
      people: data.people.map((p) =>
        p.id === id
          ? {
              ...p,
              name: input.name,
              role: input.seniority,
              pronouns: input.pronouns,
              initials: initialsOf(input.name),
              cadenceDays: input.cadenceDays,
              seniority: input.seniority,
              team: input.team,
              location: input.location,
              timezone: input.timezone,
              onCall: input.onCall,
              joinedDate: input.joinedDate,
            }
          : p,
      ),
    };
  },

  removePerson(data: AppData, id: string): AppData {
    return { ...data, people: data.people.filter((p) => p.id !== id) };
  },
```

- [ ] **Step 4: Add hook wrappers** to the `useMemo` return object:

```ts
      updatePerson: (id: string, input: ReportFields) =>
        data && apply(reducers.updatePerson(data, id, input)),
      removePerson: (id: string) =>
        data && apply(reducers.removePerson(data, id)),
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/state/useAppState.test.ts && npm run typecheck`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/state/useAppState.ts src/state/useAppState.test.ts
git commit -m "feat(state): updatePerson + removePerson reducers + wrappers"
```

---

## Task 5: `ReportForm` shared component

**Files:** Create `src/ui/ReportForm.tsx`, `src/ui/ReportForm.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/ui/ReportForm.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ReportForm } from "./ReportForm";

describe("ReportForm", () => {
  it("submits entered fields (add mode)", async () => {
    const onSubmit = vi.fn();
    render(<ReportForm mode="add" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Maya Chen");
    await userEvent.click(screen.getByRole("button", { name: /add report/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maya Chen", cadenceDays: expect.any(Number) }),
    );
  });

  it("blocks submit when name is blank", async () => {
    const onSubmit = vi.fn();
    render(<ReportForm mode="add" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /add report/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/name/i));
  });

  it("pre-fills in edit mode", () => {
    render(
      <ReportForm
        mode="edit"
        initial={{ name: "Dana", pronouns: "they/them", cadenceDays: 7, seniority: "Staff",
          team: "Infra", location: "NYC", timezone: "America/New_York", onCall: false, joinedDate: "2024-01-01" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Dana");
    expect(screen.getByLabelText(/team/i)).toHaveValue("Infra");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ReportForm mode="add" onSubmit={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- src/ui/ReportForm.test.tsx`
Expected: FAIL (`ReportForm` missing).

- [ ] **Step 3: Implement `src/ui/ReportForm.tsx`** (verify token classes against existing `src/ui` files — `bg-paper`/`text-ink`/`text-bad`/`border-line`/`bg-matcha-deep`/`text-paper`/`text-muted` are all real per prior tasks; no raw hex):

```tsx
import { useState } from "react";
import type { ReportFields } from "../domain/types";

const CADENCES = [
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every 3 weeks", days: 21 },
  { label: "Monthly", days: 30 },
];

const browserTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
};

const EMPTY: ReportFields = {
  name: "", pronouns: "", cadenceDays: 14, seniority: "", team: "",
  location: "", timezone: browserTz(), onCall: false, joinedDate: null,
};

interface ReportFormProps {
  mode: "add" | "edit";
  initial?: ReportFields;
  onSubmit: (fields: ReportFields) => void;
}

export function ReportForm({ mode, initial, onSubmit }: ReportFormProps) {
  const [f, setF] = useState<ReportFields>(initial ?? EMPTY);
  const [error, setError] = useState(false);
  const set = <K extends keyof ReportFields>(k: K, v: ReportFields[K]) => setF((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { setError(true); return; }
    onSubmit({ ...f, name: f.name.trim() });
  }

  const field = "mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg font-sans text-ink">
      <label htmlFor="rf-name" className="block text-sm font-medium">Name</label>
      <input id="rf-name" className={field} value={f.name} onChange={(e) => set("name", e.target.value)} />

      <label htmlFor="rf-cadence" className="block text-sm font-medium">Meeting cadence</label>
      <select id="rf-cadence" className={field} value={f.cadenceDays}
        onChange={(e) => set("cadenceDays", Number(e.target.value))}>
        {CADENCES.map((c) => <option key={c.days} value={c.days}>{c.label}</option>)}
      </select>

      <label htmlFor="rf-seniority" className="block text-sm font-medium">Seniority</label>
      <input id="rf-seniority" className={field} value={f.seniority} onChange={(e) => set("seniority", e.target.value)} />

      <label htmlFor="rf-team" className="block text-sm font-medium">Team</label>
      <input id="rf-team" className={field} value={f.team} onChange={(e) => set("team", e.target.value)} />

      <label htmlFor="rf-location" className="block text-sm font-medium">Location</label>
      <input id="rf-location" className={field} value={f.location} onChange={(e) => set("location", e.target.value)} />

      <label htmlFor="rf-tz" className="block text-sm font-medium">Timezone</label>
      <input id="rf-tz" className={field} value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />

      <label htmlFor="rf-joined" className="block text-sm font-medium">Joined</label>
      <input id="rf-joined" type="date" className={field}
        value={f.joinedDate ?? ""} onChange={(e) => set("joinedDate", e.target.value || null)} />

      <label htmlFor="rf-pronouns" className="block text-sm font-medium">Pronouns</label>
      <input id="rf-pronouns" className={field} value={f.pronouns} onChange={(e) => set("pronouns", e.target.value)} />

      <label className="flex items-center gap-2 mb-4 text-sm font-medium">
        <input type="checkbox" checked={f.onCall} onChange={(e) => set("onCall", e.target.checked)} />
        On-call
      </label>

      {error && <p role="alert" className="text-sm text-bad mb-4">Name is required.</p>}

      <button type="submit"
        className="px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2">
        {mode === "add" ? "Add report" : "Save changes"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- src/ui/ReportForm.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Full suite + typecheck + lint**

Run: `npm test && npm run typecheck && npm run lint:tokens`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ReportForm.tsx src/ui/ReportForm.test.tsx
git commit -m "feat(ui): shared ReportForm (add/edit, WCAG AA)"
```

---

## Task 6: `/new` route + NewReportScreen + Overview "Add report" button

Integration — read `src/ui/App.tsx` and `src/ui/Overview.tsx` first.

**Files:** Create `src/ui/NewReportScreen.tsx`; Modify `src/ui/App.tsx`, `src/ui/Overview.tsx`

- [ ] **Step 1: Create `src/ui/NewReportScreen.tsx`:**

```tsx
import { useNavigate } from "react-router-dom";
import { Masthead } from "./Masthead";
import { ReportForm } from "./ReportForm";
import type { ReportFields } from "../domain/types";

export function NewReportScreen({ onAdd }: { onAdd: (f: ReportFields) => string | undefined }) {
  const navigate = useNavigate();
  return (
    <>
      <Masthead />
      <main id="main" className="max-w-content mx-auto px-6 py-8">
        <h1 className="font-sans font-bold text-2xl text-ink mb-6">Add a report</h1>
        <ReportForm
          mode="add"
          onSubmit={(f) => {
            const id = onAdd(f);
            if (id) navigate(`/person/${id}`);
          }}
        />
      </main>
    </>
  );
}
```

- [ ] **Step 2: Wire the route in `App.tsx`** — import the screen, and inside `AuthedApp`'s `<Routes>` add (the `state` is the `ReadyState`):

```tsx
import { NewReportScreen } from "./NewReportScreen";
// ...
        <Route path="/new" element={<NewReportScreen onAdd={state.addPerson} />} />
```

- [ ] **Step 3: Add the "Add report" button in `Overview.tsx`** — import `Link` from `react-router-dom` (if not already) and add a button. In the `Masthead` `rightSlot`, alongside the `{people.length} reports` text, add a link styled as a button:

```tsx
<Link to="/new" className="ml-3 px-3 py-1.5 rounded-md bg-matcha-deep text-paper font-sans text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2">
  Add report
</Link>
```

And in the empty state (when `people.length === 0`), add a prominent CTA below the headline area — a `Link to="/new"` with the same styling but larger, labelled "Add your first report". (Place it near the `<h1>` / before the reports list; match existing spacing.)

- [ ] **Step 4: Typecheck + lint + build both modes**

Run:
```bash
npm run typecheck && npm run lint:tokens && npm test
VITE_BACKEND=local npm run build && VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: green; both builds succeed. (`state.addPerson` exists from Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/ui/NewReportScreen.tsx src/ui/App.tsx src/ui/Overview.tsx
git commit -m "feat(ui): /new add-report screen + Overview add button"
```

---

## Task 7: `/person/:id/edit` + EditReportScreen (with delete) + Person Edit link

Integration — read `src/ui/Person.tsx` and `src/ui/App.tsx` first.

**Files:** Create `src/ui/EditReportScreen.tsx`; Modify `src/ui/App.tsx`, `src/ui/Person.tsx`

- [ ] **Step 1: Create `src/ui/EditReportScreen.tsx`** (prefilled form + inline two-step delete):

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Masthead } from "./Masthead";
import { ReportForm } from "./ReportForm";
import type { AppData, ReportFields } from "../domain/types";

interface Props {
  data: AppData;
  onUpdate: (id: string, f: ReportFields) => void;
  onRemove: (id: string) => void;
}

export function EditReportScreen({ data, onUpdate, onRemove }: Props) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const person = data.people.find((p) => p.id === id);

  if (!person) {
    return (
      <>
        <Masthead />
        <main id="main" className="max-w-content mx-auto px-6 py-8">
          <h1 className="font-sans font-bold text-2xl text-ink">Person not found.</h1>
        </main>
      </>
    );
  }

  const initial: ReportFields = {
    name: person.name, pronouns: person.pronouns, cadenceDays: person.cadenceDays,
    seniority: person.seniority ?? "", team: person.team ?? "", location: person.location ?? "",
    timezone: person.timezone ?? "", onCall: person.onCall ?? false, joinedDate: person.joinedDate ?? null,
  };

  return (
    <>
      <Masthead />
      <main id="main" className="max-w-content mx-auto px-6 py-8">
        <h1 className="font-sans font-bold text-2xl text-ink mb-6">Edit {person.name}</h1>
        <ReportForm mode="edit" initial={initial} onSubmit={(f) => { onUpdate(id, f); navigate(`/person/${id}`); }} />

        <div className="mt-8 pt-6 border-t border-line">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="font-mono text-sm text-bad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1">
              Delete report
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink">Delete {person.name} permanently?</span>
              <button type="button" onClick={() => { onRemove(id); navigate("/"); }}
                className="px-3 py-1.5 rounded-md bg-bad text-paper font-sans text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="font-mono text-sm text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1">
                Cancel
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
```

(Verify `bg-bad` exists as a token; if only `text-bad` exists, use `bg-matcha-deep` for the confirm button and keep `text-bad` for the trigger — adapt to real tokens, no raw hex.)

- [ ] **Step 2: Wire the route in `App.tsx`** — import and add inside `<Routes>`:

```tsx
import { EditReportScreen } from "./EditReportScreen";
// ...
        <Route path="/person/:id/edit"
          element={<EditReportScreen data={state.data} onUpdate={state.updatePerson} onRemove={state.removePerson} />} />
```

- [ ] **Step 3: Add an "Edit" link on the Person screen** — in `src/ui/Person.tsx`, near the header (around the name/role block, ~line 299–313), add a `Link` to the edit route:

```tsx
<Link to={`/person/${person.id}/edit`}
  className="font-mono text-xs text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1">
  Edit
</Link>
```

(Ensure `Link` is imported from `react-router-dom` in Person.tsx; place the link where it reads naturally in the header.)

- [ ] **Step 4: Typecheck + lint + test + both builds**

Run:
```bash
npm run typecheck && npm run lint:tokens && npm test
VITE_BACKEND=local npm run build && VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: green; both builds succeed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/EditReportScreen.tsx src/ui/App.tsx src/ui/Person.tsx
git commit -m "feat(ui): /person/:id/edit screen with delete + Person edit link"
```

---

## Task 8: Person Profile block (computed tenure) + real `NOW` in the supabase build

**Files:** Modify `src/ui/Person.tsx`, `src/ui/App.tsx`

- [ ] **Step 1: Make `NOW` real in the supabase build** — in `src/ui/App.tsx`, replace `const NOW = "2026-06-04";` with:

```ts
// Demo build keeps a frozen date so the seeded sample never drifts; the real
// (supabase) app uses the actual today so tenure/cadence/staleness are live.
const NOW =
  import.meta.env.VITE_BACKEND === "supabase"
    ? new Date().toISOString().slice(0, 10)
    : "2026-06-04";
```

- [ ] **Step 2: Show a Profile block + computed tenure on the Person screen** — in `src/ui/Person.tsx`:

(a) Import the helper: `import { tenureLabel } from "../domain/time";` and ensure the screen has access to `now` (the Person component already receives `now` as a prop — confirm and use it).

(b) Replace the existing tenure line `{person.tenureMonths}mo tenure` with the computed label:

```tsx
{tenureLabel(person.joinedDate, now, person.tenureMonths)} tenure
```

(c) Add a Profile block in the body (after the header, before the existing prep digest / coverage sections) that lists the descriptive fields, skipping empty ones:

```tsx
<section aria-label="Profile" className="bg-paper border border-line rounded-lg p-4 mb-4 font-mono text-sm text-ink">
  <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
    {person.seniority ? (<><dt className="text-muted">Seniority</dt><dd>{person.seniority}</dd></>) : null}
    {person.team ? (<><dt className="text-muted">Team</dt><dd>{person.team}</dd></>) : null}
    {person.location ? (<><dt className="text-muted">Location</dt><dd>{person.location}</dd></>) : null}
    {person.timezone ? (<><dt className="text-muted">Timezone</dt><dd>{person.timezone}</dd></>) : null}
    <dt className="text-muted">On-call</dt><dd>{person.onCall ? "Yes" : "No"}</dd>
  </dl>
</section>
```

(Adapt spacing/placement to read well with the existing layout; tokens only.)

- [ ] **Step 3: Full verification**

Run:
```bash
npm test && npm run typecheck && npm run lint:tokens
VITE_BACKEND=local npm run build && VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: all green; both builds succeed. Confirm the demo build still shows the seeded people unchanged (frozen NOW), and the existing Person axe test still passes.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Person.tsx src/ui/App.tsx
git commit -m "feat(ui): Person profile block + computed tenure; live date in supabase build"
```

---

## Done criteria

- [ ] `addPerson`/`updatePerson`/`removePerson` reducers + tenure/initials/hue helpers unit-tested.
- [ ] `ReportForm` (add + edit + blank-name + axe) tested; shared by `/new` and `/person/:id/edit`.
- [ ] Overview has an "Add report" button + empty-state CTA; Person has Edit; edit screen has delete (confirm).
- [ ] Tenure is computed from `joinedDate`; supabase build uses real today, demo stays frozen.
- [ ] `npm test && npm run typecheck && npm run lint:tokens` green; both builds compile; demo behavior unchanged.

## Final manual validation (the full 2a+2b + this feature, end to end)

With the Supabase `.env` and dev server: log in → **Add report** (fill the form) → lands on the new person → **reload** (persists to Supabase) → **Edit** (change a field, save) → **Delete** (confirm → back to Overview) → check the `app_data` row reflects the changes → **Log out**. That validates the full write path + CRUD live. Then final review + merge of 2a + 2b + manage-reports.
