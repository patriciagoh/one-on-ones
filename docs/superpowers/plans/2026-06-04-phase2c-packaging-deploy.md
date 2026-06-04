# Phase 2c — Packaging + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app self-hostable (configurable base, self-hosted fonts, a "run your own" guide + Vercel button) and deploy the author's own live instance to Vercel.

**Architecture:** Three small code/docs changes (env-driven Vite `base`; swap Google-Fonts `@import` for `@fontsource` packages; README guide + deploy button), then a guided manual Vercel deploy. Verification is build-and-grep (config/docs have no unit surface); existing tests stay green.

**Tech Stack:** Vite, `@fontsource/*` font packages, Vercel, README/Markdown.

**Source spec:** `docs/superpowers/specs/2026-06-04-phase2c-packaging-deploy-design.md`

---

## File structure

| File | Change |
|---|---|
| `vite.config.ts` | env-driven `base` |
| `package.json` / lockfile | add `@fontsource/{newsreader,hanken-grotesk,space-mono}` |
| `src/index.css` | swap `matcha-oat-design-system/fonts.css` import for `@fontsource` weight imports |
| `README.md` | "Run your own" guide + Deploy-to-Vercel button |

---

## Task 1: Configurable base path

**Files:** Modify `vite.config.ts`

- [ ] **Step 1: Make `base` env-driven.** In `vite.config.ts`, change line 7 from:

```ts
  base: "/one-on-ones/",
```
to:
```ts
  // Configurable for different hosts: GitHub Pages serves /one-on-ones/ (default),
  // a root-domain host (Vercel) sets VITE_BASE=/, self-hosters set their own path.
  base: process.env.VITE_BASE || "/one-on-ones/",
```

- [ ] **Step 2: Verify the default build (Pages) is unchanged**

Run: `npm run build && grep -o '/one-on-ones/assets/[^"]*' dist/index.html | head -1`
Expected: prints a `/one-on-ones/assets/...` path (default base intact).

- [ ] **Step 3: Verify the root-base build (Vercel) emits root asset paths**

Run: `VITE_BASE=/ npm run build && grep -c '/one-on-ones/' dist/index.html`
Expected: `0` (no `/one-on-ones/` references). Then confirm root assets exist:
`grep -o '/assets/[^"]*' dist/index.html | head -1` → prints `/assets/...`.

- [ ] **Step 4: Tests + typecheck still green**

Run: `npm test && npm run typecheck`
Expected: 101 tests pass, clean.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "feat(build): env-driven base path (VITE_BASE) for non-Pages hosts"
```

---

## Task 2: Self-host fonts (drop the Google Fonts request)

**Files:** Modify `package.json` (+ lockfile), `src/index.css`

Context: `src/index.css:2` imports `matcha-oat-design-system/fonts.css`, which `@import`s Google Fonts. The design-system `tokens.css` references families `"Newsreader"` (serif), `"Hanken Grotesk"` (sans), `"Space Mono"` (mono). Use the **non-variable** `@fontsource` packages so the registered family names match those tokens exactly.

- [ ] **Step 1: Check whether the `Sacramento` font is actually used**

Run: `grep -rin "sacramento" src/`
- If **no matches**: Sacramento is unused in this app (it's in the design-system import but not referenced) — do NOT vendor it.
- If matches exist: also `npm install @fontsource/sacramento` and add `@import "@fontsource/sacramento/400.css";` in Step 3.

- [ ] **Step 2: Install the font packages**

Run: `npm install @fontsource/newsreader @fontsource/hanken-grotesk @fontsource/space-mono`
Expected: added to `dependencies`. (These are CSS + woff2 only — no install scripts, so the `.npmrc` `ignore-scripts=true` doesn't affect them.)

- [ ] **Step 3: Swap the import in `src/index.css`.** Replace line 2 (`@import "matcha-oat-design-system/fonts.css";`) with the matching weights (roman + italic for Newsreader; the sans weights; mono 400/700):

```css
/* Self-hosted fonts (replaces matcha-oat-design-system/fonts.css → Google Fonts).
   Family names match the --serif/--sans/--mono tokens in tokens.css. */
@import "@fontsource/newsreader/400.css";
@import "@fontsource/newsreader/500.css";
@import "@fontsource/newsreader/600.css";
@import "@fontsource/newsreader/400-italic.css";
@import "@fontsource/newsreader/500-italic.css";
@import "@fontsource/hanken-grotesk/400.css";
@import "@fontsource/hanken-grotesk/500.css";
@import "@fontsource/hanken-grotesk/600.css";
@import "@fontsource/hanken-grotesk/700.css";
@import "@fontsource/space-mono/400.css";
@import "@fontsource/space-mono/700.css";
```

Keep the `tokens.css` and `./styles/tokens.ooo.css` imports (lines 1 and 3) as-is.

- [ ] **Step 4: Build and confirm NO Google Fonts request remains**

Run: `npm run build && (grep -rn "fonts.googleapis" dist && echo "FAIL: google fonts present" || echo "OK: no google fonts")`
Expected: `OK: no google fonts`. (The font woff2 files should now be bundled under `dist/assets/`.)

- [ ] **Step 5: Tests + typecheck + lint + both builds**

Run:
```bash
npm test && npm run typecheck && npm run lint:tokens
npm run build && VITE_BASE=/ npm run build
```
Expected: 101 tests pass; lint clean; both builds succeed.

- [ ] **Step 6: Manual visual check (briefly)**

Run `npm run dev`, open the app, confirm headings (Newsreader serif), body (Hanken Grotesk), and mono labels render as before, and the Network tab shows **no request to `fonts.googleapis.com`/`fonts.gstatic.com`**. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/index.css
git commit -m "feat(fonts): self-host via @fontsource; drop Google Fonts network call"
```

---

## Task 3: README "Run your own" guide + Deploy-to-Vercel button

**Files:** Modify `README.md`

- [ ] **Step 1: Add a "Run your own" section.** Append to `README.md` (read the file first; place it after the existing intro/feature sections, before the License section). Use exactly this content:

````markdown
## Run your own

This is two builds from one codebase, chosen by `VITE_BACKEND`:

- **`local`** (the public demo) — seeded sample data, no login, everything in your browser's
  `localStorage`. This is what's deployed to GitHub Pages.
- **`supabase`** (the real app) — your data lives in your own Supabase project, behind an
  email + password login. This is what you self-host.

### Host the real app (Supabase, free tier)

1. **Clone** this repo (or use it as a template).
2. **Create a free [Supabase](https://supabase.com) project.** In the SQL Editor, run the
   contents of [`supabase/schema.sql`](./supabase/schema.sql) — it creates the `app_data` table
   and the row-level-security rules so each user can only ever see their own data.
3. **Add your user:** Authentication → Users → Add user (email + password, mark confirmed).
   There is no in-app sign-up by design — this is a private, single-user tool.
4. **Get your keys:** Project Settings → API → your **Project URL** and **publishable key**
   (the `sb_publishable_…` one — safe to ship; never use the secret key).
5. **Set environment variables** (in your host, or a local `.env` — see [`.env.example`](./.env.example)):
   ```
   VITE_BACKEND=supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
   VITE_BASE=/
   ```
6. **Deploy** (one click below, or `npm run build` and serve `dist/` on any static host):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpatriciagoh%2Fone-on-ones&env=VITE_BACKEND,VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_BASE&envDescription=Build%20mode%20%2B%20your%20Supabase%20connection)

7. Open your deployed URL and **log in** with the user from step 3.

### Fully self-hosted Supabase

Prefer not to use Supabase's cloud? Supabase is open source — run it yourself with Docker
(see the [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting/docker)),
then point `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` at your instance. Everything else is identical.
````

- [ ] **Step 2: Verify the README renders sensibly**

Run: `grep -n "Run your own\|Deploy with Vercel\|VITE_BACKEND=supabase" README.md`
Expected: the section, button, and env block are present.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: 'Run your own' self-host guide + Deploy-to-Vercel button"
```

---

## Task 4 (manual, guided): Deploy the author's live instance to Vercel

This is a hands-on step the author performs in the Vercel dashboard; the controller provides the exact values. No repo changes (unless a `vercel.json` proves necessary — it should not, given Vite auto-detection + HashRouter needing no rewrites).

- [ ] **Step 1:** Ensure `main` is pushed to GitHub (so Vercel can import it). Merge this branch first (see finishing step), then push `main`.
- [ ] **Step 2:** At [vercel.com](https://vercel.com) → **Add New → Project** → import the `patriciagoh/one-on-ones` repo. Framework preset: **Vite**. Build command `npm run build`, output dir `dist` (defaults).
- [ ] **Step 3:** Add **Environment Variables** (Production):
  - `VITE_BACKEND` = `supabase`
  - `VITE_SUPABASE_URL` = the Supabase Project URL
  - `VITE_SUPABASE_ANON_KEY` = the `sb_publishable_…` key
  - `VITE_BASE` = `/`
- [ ] **Step 4:** Deploy. Open the Vercel URL → log in with the dashboard user → confirm it loads empty-but-ready, add a person, reload (persists), log out. (Same flow validated in 2a/2b.)
- [ ] **Step 5:** Confirm the GitHub Pages demo still works unchanged (seeded, no login) — the two deployments coexist from the same `main`.

---

## Done criteria

- [ ] `VITE_BASE` controls the base path; default build still emits `/one-on-ones/`, `VITE_BASE=/` emits root paths.
- [ ] No `fonts.googleapis.com` in the built output; fonts render identically; `@fontsource` packages vendored.
- [ ] README has a clear "Run your own" guide + working Deploy-to-Vercel button.
- [ ] `npm test && npm run typecheck && npm run lint:tokens` green; both builds succeed.
- [ ] Author's Vercel instance is live and login-gated; Pages demo unchanged.

## Notes

- The Pages workflow is unchanged — it builds `VITE_BACKEND=local` with the default base, so the demo keeps working. Vercel builds independently with the supabase env.
- No secrets in the repo: keys live only in Vercel's env settings and the gitignored local `.env`.
