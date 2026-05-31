# Meaningful 1:1s

A local, no-backend tool that helps a manager run meaningful 1:1s by capturing
conversation *threads* and surfacing, per report, what to raise next and how
coverage looks over time.

See the design spec in `docs/superpowers/specs/` for the concept and model.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test        # run the domain + storage unit tests once
npm run test:watch
```

## Architecture

- `src/domain/` — pure types + derived computations (ranking, coverage, blind
  spots). No React/DOM. This is where the logic and tests live.
- `src/storage/` — `localStorage`-backed store behind an injectable interface,
  plus seed data.
- `src/state/` — the React hook binding store + mutations.
- `src/ui/` — the single per-person screen and its parts.

Data lives in your browser's localStorage; clearing site data resets to the seed.
