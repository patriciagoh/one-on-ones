# Phase 2b — Login (Email + Password, Locked-Down) — Design Spec

**Date:** 2026-06-03
**Status:** Draft — awaiting user review
**Type:** Second sub-piece of Phase 2. 2b = authentication UI + gate. (2a = storage plumbing, done; 2c = config/deploy/packaging, next.)
**Parent spec:** `docs/superpowers/specs/2026-06-03-supabase-self-host-design.md`
**Branch:** `phase2a-backend-foundation` (2a + 2b stack here; validated and merged together)

## Goal

Let a user log into the Supabase app build with email + password, so the per-user data
plumbing from 2a has a real authenticated session. After 2b, the app is human-usable
end to end (log in → your data → log out).

## Locked decisions (from brainstorming)

- **Login only — no in-app sign-up** (the single-user "locked down" model). The deployer
  creates their one account in the Supabase dashboard during setup (documented in 2c).
- **No email-confirmation flow and no SMTP dependency** (dashboard-created users are
  auto-confirmed).
- **Password reset deferred** (via the Supabase dashboard if ever needed) — keeps 2b lean.
- **Auth applies only to the `supabase` build.** The `local` demo build is unchanged: no
  login, seeded data, exactly as today.

## Architecture

### Build-scope

Everything in 2b is gated behind `import.meta.env.VITE_BACKEND === "supabase"`. In the
`local` build the auth gate is bypassed entirely (no session concept, no login screen) —
the demo behaves exactly as it does now.

### The `auth` seam (testable, mirrors 2a's `RowStore`)

A small interface isolates Supabase auth so the gate logic is unit-testable against a fake,
and the real implementation wraps `supabase.auth`:

```
interface AuthPort {
  getSession(): Promise<Session | null>;       // current session, or null
  signIn(email, password): Promise<void>;       // throws on bad credentials
  signOut(): Promise<void>;
  onAuthChange(cb: (session: Session | null) => void): () => void; // returns unsubscribe
}
```

- Real impl wraps `supabase.auth.getSession()`, `signInWithPassword()`, `signOut()`,
  `onAuthStateChange()`.
- `Session` is reduced to what the app needs (presence + user id); the app never handles
  passwords (Supabase does, hashed).

### The auth gate (sits above the 2a data gate)

On startup in the supabase build:
1. Check for an existing session (Supabase persists it in the browser → stay logged in
   across visits).
2. **No session** → render `LoginScreen`.
3. **Session present** → fall through to the existing 2a data gate (Loading → ready/error)
   → the app.
4. Subscribe to auth changes so login/logout updates the UI immediately, and so a logout
   tears down the in-memory data.

Ordering: **auth gate → data gate → app.** A logout returns to `LoginScreen`; a login
proceeds to the data load.

### Components

| Unit | Responsibility |
|---|---|
| `AuthPort` + `supabaseAuth(client)` | the seam + real Supabase binding |
| `useAuth(authPort)` hook | tracks `session`/`status` (checking → authed → anon), exposes `signIn`/`signOut`; subscribes to `onAuthChange` |
| `LoginScreen` | email + password form; "Log in"; inline `aria-live` error on bad credentials; WCAG 2.2 AA (labeled inputs, focus-to-first-field, visible focus rings) |
| `App.tsx` | in supabase build, render auth gate above the data gate; pass session through; add a Log-out control to the Masthead |

### Log out

A "Log out" control in `Masthead` (only rendered in the supabase build) → `signOut()` →
session cleared → auth gate shows `LoginScreen`. In-memory data is dropped on logout.

## Data flow & error handling

- Startup: `checking` (brief) → if session: data gate; if not: `LoginScreen`.
- Login submit: disable the button, call `signIn`; on success the auth-change listener
  advances the gate; on failure show an inline error ("Wrong email or password") and
  re-enable — no crash, no leak of which field was wrong.
- Network/unknown auth error: surface a generic retryable error in the login form.

## Testing

- **Unit-test the gate/`useAuth` logic against a fake `AuthPort`** where feasible in the
  `node` env: getSession→null yields the anon state; a session yields authed; signOut
  returns to anon. (Per the existing convention, React components/hooks needing a DOM are
  not unit-tested here; the `LoginScreen` visuals + focus are verified in the manual run.)
- The **auth-seam logic** (mapping Supabase responses to `Session | null`, error
  surfacing) is unit-tested against a fake client.
- Existing **74 tests stay green**; the **demo build behavior is unchanged** (no auth path);
  both `VITE_BACKEND` builds compile in CI.

## File structure

| File | Responsibility | Change |
|---|---|---|
| `src/storage/auth.ts` | `AuthPort` interface + `supabaseAuth(client)` real binding | Create |
| `src/state/useAuth.ts` | auth-state hook over `AuthPort` | Create |
| `src/state/useAuth.test.ts` (or in storage) | gate/seam logic tests vs fake AuthPort | Create |
| `src/ui/LoginScreen.tsx` | login form (matcha-oat, WCAG AA) | Create |
| `src/ui/LoginScreen.axe.test.tsx` | axe test for the login screen | Create |
| `src/ui/App.tsx` | auth gate above data gate (supabase build only) | Modify |
| `src/ui/Masthead.tsx` | Log-out control (supabase build only) | Modify |

## Non-goals (out of 2b)

- In-app sign-up / registration UI (locked-down model).
- Password reset, email confirmation, magic links, OAuth/Google.
- Multi-user roles / teams / sharing (deferred to a later phase).
- Polished session-expiry UX beyond returning to the login screen.

## Validation gate (the joint manual check, finally)

After 2b: deploy with Supabase env, create a user in the Supabase dashboard, log in through
the real form, confirm data loads empty-but-ready, add a person, reload → it persists, and
the Supabase table shows one row owned by that user. This validates **2a + 2b together** —
then final review + merge.

## Open questions for implementation-planning

- Exact `Session` shape the app needs (likely just `{ userId: string }` — presence is what
  the gate cares about).
- Whether `useAuth` and the data `useAppState` compose in `App.tsx` or nest (recommend:
  auth gate is the outer component; `useAppState` only mounts once authed).
- Reduced surface of `AuthPort` so the fake is trivial.

## Risks & mitigations

- **Gate ordering bug (data loads before auth).** Mitigation: `useAppState` must only mount
  after the auth gate confirms a session; unit-test the gate decision.
- **Stale session / logout race.** Mitigation: drive UI off `onAuthChange`, not a one-time
  read; unsubscribe on unmount.
- **Demo build accidentally pulling in auth.** Mitigation: auth strictly behind the
  `VITE_BACKEND` check; CI builds both modes; demo tests stay green.
