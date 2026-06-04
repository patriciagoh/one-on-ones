# Phase 2c — Self-Host Packaging + Deploy — Design Spec

**Date:** 2026-06-04
**Status:** Draft — awaiting user review
**Type:** Packaging, docs, and deployment — the final piece of Phase 2. Makes the real app self-hostable by anyone and deploys the author's own live instance.
**Parent spec:** `docs/superpowers/specs/2026-06-03-supabase-self-host-design.md`
**Branch:** `phase2c-packaging`

## Goal

Make the Supabase-backed app **deployable by anyone** (the open-source "run your own" goal),
fix the deferred **Google-Fonts privacy leak**, and stand up the **author's own live instance**
on Vercel — so the app is usable day-to-day without `npm run dev`.

## Locked decisions (from brainstorming)

- **Host for the author's real instance: Vercel** (free tier; build-time env in the dashboard).
- **Configurable base path** so the real instance serves at root (`/`) while the Pages demo
  stays at `/one-on-ones/`.
- **Font self-hosting via `@fontsource` packages** (vendored through npm; no runtime Google call).
- **One repo → two live deployments:** GitHub Pages (demo, `VITE_BACKEND=local`, base
  `/one-on-ones/`) and Vercel (real app, `VITE_BACKEND=supabase`, base `/`), both auto-deploying
  from `main`.

## Architecture / changes

### 1. Configurable base path

`vite.config.ts` currently hardcodes `base: "/one-on-ones/"`. Change to:

```ts
base: process.env.VITE_BASE || "/one-on-ones/",
```

- **Pages demo:** CI sets nothing → default `/one-on-ones/` (unchanged).
- **Vercel real instance:** sets `VITE_BASE=/` → assets load from root.
- **Self-hosters:** set `VITE_BASE` to wherever they mount the app.

The app uses **HashRouter**, so routing needs no server rewrite rules on any host — only the
asset base matters, which `VITE_BASE` handles. (Confirm `vite.config.ts` can read
`process.env` at config eval; it can — config runs in Node.)

### 2. Font self-hosting (privacy fix)

Today `src/index.css` imports the design system's `fonts.css`, which `@import`s Google Fonts —
a third-party request leaking each visitor's IP. Replace it:

- `npm install` the `@fontsource` packages for the design system's families (read
  `node_modules/matcha-oat-design-system/fonts.css` to get the exact families/weights — e.g.
  Newsreader for `--serif`, plus the `--sans` and `--mono` families).
- In `src/index.css`, **stop importing the design-system `fonts.css`** and instead import the
  matching `@fontsource/*` CSS (the needed weights). Keep importing the design-system
  `tokens.css` (the `--serif/--sans/--mono` variables) — those reference family *names*, which
  `@fontsource` provides locally.
- Result: identical typography, zero Google network calls, for **both** the demo and the real
  instance. Verify the production CSS no longer contains `fonts.googleapis.com`.

### 3. "Run your own" README section

A clear, copy-pasteable guide (Path A — Supabase cloud free tier):
1. Use this template / clone the repo.
2. Create a free Supabase project; run `supabase/schema.sql` in its SQL editor.
3. Add your user in Authentication → Users (email + password; this app is **login-only, no
   public sign-up** by design).
4. Set env: `VITE_BACKEND=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   (publishable key), `VITE_BASE=/`.
5. Deploy (Vercel one-click button, or any static host serving `dist/`).
6. Log in.

Plus: a one-paragraph pointer to **full self-hosting** (running Supabase via Docker) for those
who don't want Supabase cloud, and a note that the **public demo build** (`VITE_BACKEND=local`)
is the seeded, no-login showcase.

### 4. "Deploy to Vercel" button

Add a Vercel deploy button to the README whose link pre-fills the required env vars
(`VITE_BACKEND`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE`) so a self-hoster
deploys in a few clicks.

### 5. Deploy the author's live instance (hands-on, guided)

Walk the author through Vercel (the steps only they can do; exact values provided):
- Create/sign in to Vercel; import the `one-on-ones` GitHub repo.
- Framework preset: Vite. Build: `npm run build`. Output: `dist`.
- Env vars: `VITE_BACKEND=supabase`, `VITE_SUPABASE_URL=<project url>`,
  `VITE_SUPABASE_ANON_KEY=<publishable key>`, `VITE_BASE=/`.
- Deploy → log in with the dashboard user → confirm it works at the Vercel URL.
- It then auto-deploys on every push to `main`, in parallel with the Pages demo.

No secrets enter the repo — the keys live only in Vercel's env settings (and the local
gitignored `.env`).

## Testing / verification

- Existing **101 tests stay green**.
- **Both builds succeed**: default (`base=/one-on-ones/`) and with `VITE_BASE=/`
  (assert the built `index.html` references assets at the expected base).
- **No Google Fonts request**: grep the built `dist` CSS for `fonts.googleapis.com` → none.
- Demo build behavior unchanged (seeded, no login, Pages base).
- Manual: the author's Vercel instance loads, logs in, and persists (same flow validated in 2a/2b).

## File structure

| File | Change |
|---|---|
| `vite.config.ts` | env-driven `base` |
| `package.json` / lockfile | add `@fontsource/*` font packages |
| `src/index.css` | swap Google-Fonts `fonts.css` import for `@fontsource` imports |
| `README.md` | "Run your own" guide + Deploy-to-Vercel button + demo note |
| `vercel.json` (optional) | only if a build/output override is needed (likely not) |

## Non-goals

- Full step-by-step Supabase-via-Docker walkthrough (brief pointer only).
- Custom domain / DNS.
- CI/GitHub-Actions changes (Vercel builds independently; Pages workflow unchanged).
- Changing auth, data model, or app behavior.

## Open questions for implementation-planning

- Exact `@fontsource` package names + weights (read the design-system `fonts.css` to match).
- Whether any `vercel.json` is needed (default Vite detection likely suffices; HashRouter needs
  no rewrites).
- Confirm `process.env.VITE_BASE` in `vite.config.ts` vs Vite's `loadEnv` (either works; pick the
  simpler that typechecks).

## Risks & mitigations

- **Font swap changes rendering.** Mitigation: match families/weights exactly from the design
  system; visual check + build; tokens.css unchanged.
- **Wrong base breaks asset loading on a host.** Mitigation: `VITE_BASE` documented per target;
  build-time assertion that index.html asset paths match the base.
- **Secrets in repo.** Mitigation: keys only in Vercel env + gitignored `.env`; `.env.example`
  holds placeholders only.
