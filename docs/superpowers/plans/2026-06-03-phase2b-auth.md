# Phase 2b — Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email+password login (locked-down, no in-app sign-up) to the Supabase app build, gating the app behind a real session, with logout — the demo build stays login-free.

**Architecture:** A small testable `AuthPort` seam wraps `supabase.auth` (mirroring 2a's `RowStore`). A `useAuth` hook tracks session state. `App` becomes an auth gate (supabase build only) that renders `LoginScreen` when signed out and the existing data-gated app when signed in. One shared Supabase client is created in a new `backend.ts` and used by both the data layer and auth. Logout reaches the shared `Masthead` via a small context (no prop-drilling).

**Tech Stack:** React + TS + Vite + Vitest, `@supabase/supabase-js`, `@testing-library/react` (component/hook tests via the `// @vitest-environment happy-dom` pragma).

**Source spec:** `docs/superpowers/specs/2026-06-03-phase2b-auth-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/storage/auth.ts` | `Session` type, `AuthPort` interface, `supabaseAuth(client)` binding | Create |
| `src/storage/auth.test.ts` | `supabaseAuth` mapping tests vs a fake client (node) | Create |
| `src/state/useAuth.ts` | auth-state hook over `AuthPort` | Create |
| `src/state/useAuth.test.tsx` | hook status transitions (happy-dom) | Create |
| `src/ui/LoginScreen.tsx` | login form (matcha-oat, WCAG AA) | Create |
| `src/ui/LoginScreen.test.tsx` | render + submit + error + axe (happy-dom) | Create |
| `src/ui/authContext.ts` | `AuthContext` for logout reaching Masthead | Create |
| `src/storage/backend.ts` | one shared client → `appStore` + `authPort` | Create |
| `src/ui/Masthead.tsx` | logout button when auth context present | Modify |
| `src/ui/Masthead.test.tsx` | logout button shows w/ provider, hidden without (happy-dom) | Create |
| `src/ui/App.tsx` | auth gate above data gate; import from `backend.ts` | Modify |

---

## Task 1: `AuthPort` seam + `supabaseAuth` binding

**Files:** Create `src/storage/auth.ts`, `src/storage/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/storage/auth.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { supabaseAuth } from "./auth";

function fakeClient(over: Record<string, unknown> = {}) {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      ...over,
    },
  } as unknown as Parameters<typeof supabaseAuth>[0];
}

describe("supabaseAuth", () => {
  it("getSession maps a Supabase session to { userId } or null", async () => {
    const none = await supabaseAuth(fakeClient()).getSession();
    expect(none).toBeNull();
    const some = await supabaseAuth(
      fakeClient({ getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) }),
    ).getSession();
    expect(some).toEqual({ userId: "u1" });
  });

  it("signIn throws on bad credentials", async () => {
    const auth = supabaseAuth(
      fakeClient({ signInWithPassword: async () => ({ error: new Error("Invalid login credentials") }) }),
    );
    await expect(auth.signIn("a@b.co", "wrong")).rejects.toThrow();
  });

  it("signIn resolves on success", async () => {
    await expect(supabaseAuth(fakeClient()).signIn("a@b.co", "right")).resolves.toBeUndefined();
  });

  it("onAuthChange forwards mapped sessions and returns an unsubscribe", () => {
    let handler: (e: string, s: unknown) => void = () => {};
    const unsub = vi.fn();
    const auth = supabaseAuth(
      fakeClient({
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          handler = cb;
          return { data: { subscription: { unsubscribe: unsub } } };
        },
      }),
    );
    const seen: Array<{ userId: string } | null> = [];
    const off = auth.onAuthChange((s) => seen.push(s));
    handler("SIGNED_IN", { user: { id: "u2" } });
    handler("SIGNED_OUT", null);
    off();
    expect(seen).toEqual([{ userId: "u2" }, null]);
    expect(unsub).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/storage/auth.test.ts`
Expected: FAIL — `supabaseAuth` does not exist.

- [ ] **Step 3: Implement `src/storage/auth.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Reduced session — the app only needs the user's id (presence = authed). */
export interface Session {
  userId: string;
}

/** Testable seam over Supabase auth (mirrors RowStore). */
export interface AuthPort {
  getSession(): Promise<Session | null>;
  /** Throws on bad credentials. */
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Subscribe to auth changes; returns an unsubscribe fn. */
  onAuthChange(cb: (session: Session | null) => void): () => void;
}

function toSession(s: { user?: { id?: string } } | null | undefined): Session | null {
  return s?.user?.id ? { userId: s.user.id } : null;
}

export function supabaseAuth(client: SupabaseClient): AuthPort {
  return {
    getSession: async () => {
      const { data } = await client.auth.getSession();
      return toSession(data.session);
    },
    signIn: async (email, password) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await client.auth.signOut();
    },
    onAuthChange: (cb) => {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/storage/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green (74 + 4 new).

- [ ] **Step 6: Commit**

```bash
git add src/storage/auth.ts src/storage/auth.test.ts
git commit -m "feat(auth): AuthPort seam + supabaseAuth binding"
```

---

## Task 2: `useAuth` hook

**Files:** Create `src/state/useAuth.ts`, `src/state/useAuth.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/state/useAuth.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import type { AuthPort, Session } from "../storage/auth";

function fakePort(session: Session | null): AuthPort {
  return {
    getSession: async () => session,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    onAuthChange: () => () => {},
  };
}

describe("useAuth", () => {
  it("resolves to 'anon' when there is no session", async () => {
    const { result } = renderHook(() => useAuth(fakePort(null)));
    expect(result.current.status).toBe("checking");
    await waitFor(() => expect(result.current.status).toBe("anon"));
    expect(result.current.session).toBeNull();
  });

  it("resolves to 'authed' when a session exists", async () => {
    const { result } = renderHook(() => useAuth(fakePort({ userId: "u1" })));
    await waitFor(() => expect(result.current.status).toBe("authed"));
    expect(result.current.session).toEqual({ userId: "u1" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/state/useAuth.test.tsx`
Expected: FAIL — `useAuth` does not exist.

- [ ] **Step 3: Implement `src/state/useAuth.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import type { AuthPort, Session } from "../storage/auth";

export type AuthStatus = "checking" | "anon" | "authed";

export function useAuth(port: AuthPort) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    const settle = (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      setStatus(s ? "authed" : "anon");
    };
    port.getSession().then(settle).catch(() => settle(null));
    const unsub = port.onAuthChange(settle);
    return () => { alive = false; unsub(); };
  }, [port]);

  const signIn = useCallback((email: string, password: string) => port.signIn(email, password), [port]);
  const signOut = useCallback(() => port.signOut(), [port]);

  return { status, session, signIn, signOut };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/state/useAuth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/state/useAuth.ts src/state/useAuth.test.tsx
git commit -m "feat(auth): useAuth hook (checking/anon/authed)"
```

---

## Task 3: `LoginScreen` component

**Files:** Create `src/ui/LoginScreen.tsx`, `src/ui/LoginScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/LoginScreen.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("submits the entered email and password", async () => {
    const onSubmit = vi.fn(async () => {});
    render(<LoginScreen onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(onSubmit).toHaveBeenCalledWith("a@b.co", "secret");
  });

  it("shows an error when sign-in fails", async () => {
    const onSubmit = vi.fn(async () => { throw new Error("bad"); });
    render(<LoginScreen onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/wrong email or password/i),
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<LoginScreen onSubmit={async () => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/LoginScreen.test.tsx`
Expected: FAIL — `LoginScreen` does not exist.

- [ ] **Step 3: Implement `src/ui/LoginScreen.tsx`**

```tsx
import { useState } from "react";

interface LoginScreenProps {
  /** Throws on failure; the screen surfaces a generic error. */
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await onSubmit(email, password);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm" aria-labelledby="login-heading">
        <h1 id="login-heading" className="font-mono font-bold text-lg text-ink">
          one-on-<span className="text-matcha-deep">ones</span>
        </h1>
        <p className="text-sm text-muted mt-1 mb-6">Log in to your 1:1s.</p>

        <label htmlFor="login-email" className="block text-sm font-medium">Email</label>
        <input
          id="login-email" type="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
        />

        <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
        <input
          id="login-password" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
        />

        {error && (
          <p role="alert" className="text-sm text-rust mb-4">Wrong email or password.</p>
        )}

        <button
          type="submit" disabled={busy}
          className="w-full px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
```

Note: verify the token classes (`text-muted`, `border-line`, `text-rust`, `bg-paper`, `text-ink`, `bg-matcha-deep`, `text-paper`) exist in the matcha-oat preset by grepping other `src/ui` files; if `text-rust` isn't a class, use the project's existing error/danger token (check how other components show errors). Do not introduce raw hex (`lint:tokens` checks `src/ui`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/ui/LoginScreen.test.tsx`
Expected: PASS (submit, error, axe).

- [ ] **Step 5: Full suite + typecheck + lint**

Run: `npm test && npm run typecheck && npm run lint:tokens`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/LoginScreen.tsx src/ui/LoginScreen.test.tsx
git commit -m "feat(auth): LoginScreen (email+password, WCAG AA)"
```

---

## Task 4: `AuthContext` + Masthead logout

**Files:** Create `src/ui/authContext.ts`, `src/ui/Masthead.test.tsx`; Modify `src/ui/Masthead.tsx`

- [ ] **Step 1: Create the context**

Create `src/ui/authContext.ts`:

```ts
import { createContext } from "react";

/** Present only in the authenticated supabase build; null elsewhere (demo). */
export const AuthContext = createContext<{ signOut: () => void } | null>(null);
```

- [ ] **Step 2: Write the failing Masthead test**

Create `src/ui/Masthead.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Masthead } from "./Masthead";
import { AuthContext } from "./authContext";

describe("Masthead logout", () => {
  it("shows a Log out button and calls signOut when auth context is provided", async () => {
    const signOut = vi.fn();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ signOut }}>
          <Masthead />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(signOut).toHaveBeenCalled();
  });

  it("renders no Log out button without auth context (demo build)", () => {
    render(<MemoryRouter><Masthead /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/ui/Masthead.test.tsx`
Expected: FAIL — no Log out button yet.

- [ ] **Step 4: Add the logout button to `Masthead`**

In `src/ui/Masthead.tsx`: add imports at the top:

```ts
import { useContext } from "react";
import { AuthContext } from "./authContext";
```

Inside the component, before the return, read the context:

```ts
  const auth = useContext(AuthContext);
```

Then render a Log out button on the right side. Replace the existing right-slot block:

```tsx
        {/* Right side: passed-in slot (counts, links, etc.) */}
        {rightSlot && (
          <div>
            {rightSlot}
          </div>
        )}
```

with:

```tsx
        {/* Right side: passed-in slot + optional logout (supabase build only) */}
        <div className="flex items-center gap-3">
          {rightSlot}
          {auth && (
            <button
              type="button"
              onClick={auth.signOut}
              className="font-mono text-xs text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
            >
              Log out
            </button>
          )}
        </div>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/ui/Masthead.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Full suite + typecheck + lint**

Run: `npm test && npm run typecheck && npm run lint:tokens`
Expected: all green. (No existing screen passes an AuthContext provider yet, so no logout button appears anywhere until Task 5 wires the provider — existing screens/tests unaffected.)

- [ ] **Step 7: Commit**

```bash
git add src/ui/authContext.ts src/ui/Masthead.tsx src/ui/Masthead.test.tsx
git commit -m "feat(auth): logout control in Masthead via AuthContext"
```

---

## Task 5: Shared backend client + auth gate in `App`

Wire it together: one Supabase client shared by data + auth, and the auth gate above the data gate. Integration task — read `App.tsx` first.

**Files:** Create `src/storage/backend.ts`; Modify `src/ui/App.tsx`

- [ ] **Step 1: Create the shared backend wiring**

Create `src/storage/backend.ts`:

```ts
import { createStore } from "./store";
import { localAppStore, type AppStore } from "./appStore";
import { supabaseAppStore } from "./supabaseAppStore";
import { createSupabaseClient, supabaseRowStore } from "./supabaseClient";
import { supabaseAuth, type AuthPort } from "./auth";

// One client shared by data + auth so the session set at login is the one the
// data layer reads. null in the local/demo build (no Supabase, no auth).
const client = import.meta.env.VITE_BACKEND === "supabase" ? createSupabaseClient() : null;

export const appStore: AppStore = client
  ? supabaseAppStore(supabaseRowStore(client))
  : localAppStore(createStore());

export const authPort: AuthPort | null = client ? supabaseAuth(client) : null;
```

(Note: `localAppStore` is imported with its `AppStore` type from `./appStore`. Confirm `appStore.ts` exports `AppStore`; it does.)

- [ ] **Step 2: Restructure `App.tsx` — import shared stores, add the auth gate**

In `src/ui/App.tsx`:

(a) Replace the inline store creation (the `import` lines for `localAppStore`/`supabaseAppStore`/`createStore`/`createSupabaseClient`/`supabaseRowStore` and the `const appStore = …` block, lines ~17–25) with a single import and the auth imports:

```ts
import { appStore, authPort } from "../storage/backend";
import { useAuth } from "../state/useAuth";
import { LoginScreen } from "./LoginScreen";
import { AuthContext } from "./authContext";
```

(b) Rename the current `export function App()` to `function AuthedApp()` (it keeps its body exactly — `useAppState(appStore)`, the loading/error gates, the router). It is the data-gated app.

(c) Add a new `export function App()` that is the auth gate:

```tsx
export function App() {
  // Demo/local build: no auth, render the app directly (unchanged behavior).
  if (!authPort) return <AuthedApp />;
  return <SupabaseAuthGate />;
}

function SupabaseAuthGate() {
  const auth = useAuth(authPort!);
  if (auth.status === "checking") return <AuthCheckingGate />;
  if (auth.status === "anon") return <LoginScreen onSubmit={auth.signIn} />;
  return (
    <AuthContext.Provider value={{ signOut: () => { void auth.signOut(); } }}>
      <AuthedApp />
    </AuthContext.Provider>
  );
}
```

(d) Add a checking gate next to the other gates:

```tsx
function AuthCheckingGate() {
  return (
    <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans">
      <p role="status" aria-live="polite">Checking your session…</p>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck and fix fallout**

Run: `npm run typecheck`
Expected: clean. (`authPort!` is safe inside `SupabaseAuthGate` because `App` only renders it when `authPort` is non-null.)

- [ ] **Step 4: Full verification (both build modes)**

```bash
npm test && npm run typecheck && npm run lint:tokens
VITE_BACKEND=local npm run build
VITE_BACKEND=supabase VITE_SUPABASE_URL=https://x.supabase.co VITE_SUPABASE_ANON_KEY=test npm run build
```
Expected: all tests green; lint clean; both builds succeed. The demo (`local`) build renders no login screen (authPort is null).

- [ ] **Step 5: Commit**

```bash
git add src/storage/backend.ts src/ui/App.tsx
git commit -m "feat(auth): auth gate above data gate; shared Supabase client"
```

---

## Done criteria for 2b

- [ ] `supabaseAuth` seam + `useAuth` unit-tested; `LoginScreen` and `Masthead` logout have happy-dom tests incl. axe.
- [ ] Supabase build: signed-out → `LoginScreen`; signed-in → data loads → app; logout returns to login.
- [ ] Demo build unchanged (no auth, no login screen, no logout button); existing tests green.
- [ ] One shared Supabase client for data + auth.
- [ ] `npm test && npm run typecheck && npm run lint:tokens` green; both builds compile.

## Joint manual validation (2a + 2b together — the deferred 2a Step 5)

Do this once after 2b, before merge:
1. Create a free Supabase project; run `supabase/schema.sql` in its SQL editor.
2. In Authentication → Users, add one user (email + password; mark confirmed).
3. Local `.env`: `VITE_BACKEND=supabase` + the project URL + anon key.
4. `npm run dev` → log in with that user through the real form.
5. Verify: empty-but-ready (0 people, 6 templates); add a person; reload → persists; the `app_data` table shows one row owned by that user; Log out → returns to login.
6. Record the result; then final review + merge (2a + 2b).
