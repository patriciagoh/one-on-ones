# Phase 1 — Baseline Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the *current* local-first app safer and legally open-source — without any architecture change — by fixing a silent data-loss bug, adding a license, and running a review pass to find and fix high-value issues.

**Architecture:** No structural change. This phase de-risks the codebase before the Supabase migration (Phase 2). All work stays within the existing four-layer architecture; only `src/storage/store.ts` is modified for code changes, plus new top-level docs/license files.

**Tech Stack:** React + TS + Vite + Tailwind, Vitest, the `/code-review` and `/security-review` skills.

**Source spec:** `docs/superpowers/specs/2026-06-03-supabase-self-host-design.md` (Phase 1).

**Deliberately omitted:** localStorage durability hardening (e.g. `navigator.storage.persist()` for Safari eviction) is *not* in this phase. Rationale: Phase 2 moves real data to Supabase (server is source of truth, eviction moot), and the demo build only holds disposable seed data — so this work would be short-lived. Recorded here so the omission is intentional, not an oversight.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/storage/store.ts` | Persistence boundary; load/save/migrate | Modify: backup-before-reseed guard + optional `backup` port method |
| `src/storage/store.test.ts` | Store behavior tests | Modify: add data-loss-guard test |
| `LICENSE` | Legal open-source grant | Create |
| `docs/superpowers/reviews/2026-06-03-phase1-findings.md` | Triaged review findings | Create (Task 3) |

---

## Task 1: Guard against silent data loss on reseed

**Problem:** `store.ts:load()` flushes the result of `migrate()` to storage whenever `parsed !== data`. `migrate()` returns a fresh `seedData()` for *any* blob it doesn't recognize as valid v2 (corrupted JSON, a future schema version, a partial write). The flush then overwrites the user's real data with seed — silently and irreversibly.

**Fix:** Before overwriting a non-null existing blob with seed, copy the original into a backup. Add an optional `backup` method to `StoragePort` (so test/Supabase ports needn't implement it) and call it from `load()`.

**Files:**
- Modify: `src/storage/store.ts`
- Test: `src/storage/store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/storage/store.test.ts` (inside the `describe("store", ...)` block):

```ts
  it("backs up an unrecognized blob before reseeding over it", () => {
    let backedUp: string | null = null;
    const original = JSON.stringify({ version: 99, secret: "real notes" });
    const port: StoragePort = {
      get: () => original,
      set: () => {},
      remove: () => {},
      backup: (v) => { backedUp = v; },
    };
    createStore(port).load();
    expect(backedUp).toBe(original);
  });

  it("does not back up when storage is empty (nothing to lose)", () => {
    let backupCalls = 0;
    const port: StoragePort = {
      get: () => null,
      set: () => {},
      remove: () => {},
      backup: () => { backupCalls += 1; },
    };
    createStore(port).load();
    expect(backupCalls).toBe(0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/storage/store.test.ts`
Expected: FAIL — `backup` is not part of `StoragePort` yet (type error) / `backedUp` stays `null`.

- [ ] **Step 3: Add the optional `backup` method to the interface and `browserPort`**

In `src/storage/store.ts`, replace the `StoragePort` interface and `browserPort`:

```ts
const KEY = "one-on-ones/v2";
const BACKUP_KEY = "one-on-ones/backup";
export const SCHEMA_VERSION = 2;

export interface StoragePort {
  get(): string | null;
  set(value: string): void;
  remove(): void;
  /** Optional: preserve a copy of a blob we're about to overwrite, so a bad
   *  or unexpected migration can never silently destroy real data. */
  backup?(value: string): void;
}

export function browserPort(): StoragePort {
  return {
    get: () => localStorage.getItem(KEY),
    set: (v) => localStorage.setItem(KEY, v),
    remove: () => localStorage.removeItem(KEY),
    backup: (v) => localStorage.setItem(BACKUP_KEY, v),
  };
}
```

- [ ] **Step 4: Call `backup` from `load()` before overwriting**

In `src/storage/store.ts`, replace the `load()` method body inside `createStore`:

```ts
    load() {
      const raw = port.get();
      const parsed = raw ? safeParse(raw) : null;
      const data = migrate(parsed);
      const reseeded = parsed !== data; // migrate returned a fresh seed
      if (raw && reseeded) port.backup?.(raw); // never destroy data silently
      if (!raw || reseeded) port.set(JSON.stringify(data));
      return data;
    },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/storage/store.test.ts`
Expected: PASS — all existing store tests plus the two new ones (the v1-migration tests still pass; backup is additive).

- [ ] **Step 6: Run the full check to confirm no regressions**

Run: `npm test && npm run typecheck`
Expected: all 55+ tests green, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/storage/store.ts src/storage/store.test.ts
git commit -m "fix(storage): back up unrecognized blob before reseeding to prevent silent data loss"
```

---

## Task 2: Add an open-source LICENSE

**Decision:** MIT — the simplest, most permissive license, matching the "anyone can take it and host their own" goal. (If you prefer Apache-2.0 for its explicit patent grant, swap the file contents; nothing else changes.)

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create the LICENSE file**

Create `LICENSE` with exactly this content (MIT):

```
MIT License

Copyright (c) 2026 Patricia Goh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Add a license line to the README**

In `README.md`, append a section at the end:

```markdown
## License

MIT — see [LICENSE](./LICENSE). You're free to use, modify, and self-host this.
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE README.md
git commit -m "docs: add MIT license"
```

---

## Task 3: Baseline review pass + triage + fix must-fix findings

**Why this task is structured differently:** the specific fixes can't be pre-written because the findings don't exist until the reviews run. So this task is *discovery → triage → fix-loop*. Do NOT skip the triage doc — it's the record of what was found and what was deferred.

**Files:**
- Create: `docs/superpowers/reviews/2026-06-03-phase1-findings.md`
- Modify: whatever the must-fix findings touch (TDD per fix)

- [ ] **Step 1: Run the code review**

Run the `/code-review` skill at high effort against the working tree (current `main`/branch state). Capture its findings.

- [ ] **Step 2: Run the security review**

Run the `/security-review` skill. Note: this is a local-first app with no backend, no auth, no secrets — expect a short report. The richer security work lands in Phase 2 (RLS). Record whatever it surfaces anyway (e.g. any `dangerouslySetInnerHTML`, dependency advisories).

- [ ] **Step 3: Write the triage doc**

Create `docs/superpowers/reviews/2026-06-03-phase1-findings.md` using this structure (fill with real findings):

```markdown
# Phase 1 Review Findings — 2026-06-03

## Must-fix (before continuing to Phase 2)
- [ ] <finding> — file:line — why it matters — planned fix

## Should-fix (cheap, do now if quick)
- [ ] <finding> — file:line — why — planned fix

## Defer (track, not now)
- <finding> — file:line — why deferred (e.g. "obviated by Supabase migration")

## Won't-fix (with reason)
- <finding> — reason
```

Triage rule: a finding is **must-fix** only if it causes incorrect behavior, data loss, or a security hole in the app *as it exists today*. Slop/style that the Phase 2 rewrite will touch anyway → **defer**.

- [ ] **Step 4: Commit the triage doc**

```bash
git add docs/superpowers/reviews/2026-06-03-phase1-findings.md
git commit -m "docs: phase 1 review findings + triage"
```

- [ ] **Step 5: Fix each must-fix finding (TDD loop)**

For EACH must-fix item, in its own commit, follow the standard cycle:
1. Write a failing test that reproduces the issue (`npm test -- <test file>` → FAIL).
2. Make the minimal change to fix it.
3. `npm test && npm run typecheck && npm run lint:tokens` → all green.
4. Check the box in the triage doc.
5. Commit: `git commit -m "fix: <finding>"`.

If a must-fix finding genuinely cannot be unit-tested (e.g. a config/dependency change), state that in the commit message and verify manually with the relevant command, recording the command + output.

- [ ] **Step 6: Final verification**

Run: `npm test && npm run typecheck && npm run lint:tokens && npm run build`
Expected: all green, build succeeds. Confirm the demo build still loads seeded data and all four screens render.

- [ ] **Step 7: Update the triage doc status**

Mark every must-fix as done (or moved to defer with a reason). Commit:

```bash
git add docs/superpowers/reviews/2026-06-03-phase1-findings.md
git commit -m "docs: close out phase 1 must-fix findings"
```

---

## Done criteria for Phase 1

- [ ] Silent-reseed data-loss bug fixed and tested.
- [ ] `LICENSE` present; README references it.
- [ ] Review findings captured, triaged, and all must-fix items resolved.
- [ ] `npm test && npm run typecheck && npm run lint:tokens && npm run build` all green.
- [ ] Demo build behavior unchanged (seeds, four screens render).

When these are met, Phase 2 (Supabase backend) gets its own plan.
