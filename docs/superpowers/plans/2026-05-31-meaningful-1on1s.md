# Meaningful 1:1s Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local, no-backend React web app that helps a manager run meaningful 1:1s by capturing conversation *threads* and surfacing, per report, what to raise next and how coverage looks over time.

**Architecture:** Three layers with a strict dependency direction. (1) A pure domain layer — types plus derived-computation functions (ranking, coverage bucketing, cadence warnings, blind-spot detection) with no React or DOM dependency. (2) A storage module wrapping `localStorage` behind a small interface, with seed data. (3) A React UI that reads from storage and renders the single per-person screen. The domain layer is where the real logic and the tests concentrate.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, Vitest for tests.

---

## File Structure

```
oneonone/
├── package.json                 # deps + scripts (created by Vite, then edited)
├── vite.config.ts               # Vite + Vitest config
├── tailwind.config.js           # Tailwind content paths
├── postcss.config.js            # Tailwind/PostCSS
├── index.html                   # Vite entry
├── tsconfig.json                # TS config (from Vite template)
├── src/
│   ├── main.tsx                 # React root mount
│   ├── index.css                # Tailwind directives
│   ├── App.tsx                  # top-level layout: people switcher + person screen
│   ├── domain/
│   │   ├── types.ts             # Thread, Person, Area, Touch, enums
│   │   ├── time.ts              # date helpers (daysBetween, weekIndex) — pure, injectable "now"
│   │   ├── compute.ts           # derived: raiseNext, areaCoverage, blindSpots, groupThreads
│   │   └── compute.test.ts      # unit tests for compute.ts (Vitest)
│   ├── storage/
│   │   ├── store.ts             # localStorage-backed CRUD behind an interface
│   │   ├── store.test.ts        # unit tests for store.ts
│   │   └── seed.ts              # sample people + areas + threads
│   ├── state/
│   │   └── useAppState.ts       # React hook: loads store, exposes data + mutations
│   └── ui/
│       ├── PeopleSwitcher.tsx   # sidebar list of reports w/ overdue status
│       ├── PersonScreen.tsx     # the one primary surface for a report
│       ├── QuickCapture.tsx     # capture-a-thread box
│       ├── RaiseNext.tsx        # highlighted "bring this up" band
│       ├── AreaCoverage.tsx     # area × last-12-weeks sparkline table
│       └── ThreadGroups.tsx     # open loops / commitments / resolved
```

**Layer rule:** `domain/` imports nothing from `storage/`, `state/`, or `ui/`. `storage/` imports only `domain/`. `ui/` and `state/` may import both.

---

## Task 1: Scaffold the Vite + React + TS project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` (most via the Vite scaffold)

- [ ] **Step 1: Scaffold with Vite into the current directory**

The repo already exists at `/Users/patricia/oneonone` with a `docs/` folder and git history. Scaffold into it without clobbering `docs/`.

Run:
```bash
cd /Users/patricia/oneonone
npm create vite@latest tmp-scaffold -- --template react-ts
cp -r tmp-scaffold/. .
rm -rf tmp-scaffold
npm install
```
Expected: `src/`, `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json` now exist; `docs/` untouched.

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev -- --port 5174` (Ctrl-C after it prints the local URL)
Expected: prints `Local: http://localhost:5174/` with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript app"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Install and init Tailwind**

Run:
```bash
cd /Users/patricia/oneonone
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```
Expected: `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 2: Set Tailwind content paths**

Replace `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: Replace `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Prove Tailwind works**

Replace `src/App.tsx` with:
```tsx
export default function App() {
  return <h1 className="text-2xl font-bold text-blue-600 p-6">1:1s</h1>
}
```
Run: `npm run dev -- --port 5174` — confirm the heading is bold and blue, then Ctrl-C.
Expected: styled heading renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS"
```

---

## Task 3: Add Vitest

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `src/domain/smoke.test.ts` (temporary)

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd /Users/patricia/oneonone
npm install -D vitest
```

- [ ] **Step 2: Enable Vitest globals in `vite.config.ts`**

Replace the file with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { globals: true, environment: 'node' },
})
```

- [ ] **Step 3: Add a `test` script to `package.json`**

In the `"scripts"` object add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `src/domain/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 6: Remove smoke test and commit**

```bash
rm src/domain/smoke.test.ts
git add -A
git commit -m "chore: add Vitest"
```

---

## Task 4: Domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Write the types**

Create `src/domain/types.ts`:
```ts
export type AreaId = string
export type PersonId = string
export type ThreadId = string

export type ThreadType = 'topic' | 'open-loop' | 'commitment'
export type ThreadState = 'active' | 'snoozed' | 'resolved'
export type CommitmentOwner = 'you' | 'them'

/** ISO date string, e.g. "2026-05-31" */
export type ISODate = string

export interface Touch {
  date: ISODate
  note?: string
}

export interface Thread {
  id: ThreadId
  personId: PersonId
  area: AreaId
  type: ThreadType
  title: string
  notes?: string
  owner?: CommitmentOwner // only for type === 'commitment'
  state: ThreadState
  snoozedUntil?: ISODate // only for state === 'snoozed'
  createdAt: ISODate
  touches: Touch[]
}

export interface PicturePoint {
  text: string
  area?: AreaId
}

export interface Person {
  id: PersonId
  name: string
  cadenceDays: number // expected gap between 1:1s
  picture: PicturePoint[]
}

export interface Area {
  id: AreaId
  name: string
  cadenceDays: number // healthy frequency for this kind of conversation
}

export interface AppData {
  people: Person[]
  areas: Area[]
  threads: Thread[]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: domain types"
```

---

## Task 5: Time helpers

**Files:**
- Create: `src/domain/time.ts`
- Test: `src/domain/time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/time.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { daysBetween, weeksAgoIndex, lastTouchedAt } from './time'
import type { Thread } from './types'

describe('daysBetween', () => {
  it('counts whole days between two ISO dates', () => {
    expect(daysBetween('2026-05-01', '2026-05-08')).toBe(7)
  })
  it('is order-independent in magnitude', () => {
    expect(daysBetween('2026-05-08', '2026-05-01')).toBe(7)
  })
})

describe('weeksAgoIndex', () => {
  it('returns 0 for the same week and increases going back', () => {
    expect(weeksAgoIndex('2026-05-31', '2026-05-31')).toBe(0)
    expect(weeksAgoIndex('2026-05-31', '2026-05-24')).toBe(1)
    expect(weeksAgoIndex('2026-05-31', '2026-05-10')).toBe(3)
  })
})

describe('lastTouchedAt', () => {
  const base: Thread = {
    id: 't1', personId: 'p1', area: 'career', type: 'topic',
    title: 'x', state: 'active', createdAt: '2026-01-01', touches: [],
  }
  it('falls back to createdAt with no touches', () => {
    expect(lastTouchedAt(base)).toBe('2026-01-01')
  })
  it('returns the most recent touch date', () => {
    const t = { ...base, touches: [{ date: '2026-02-01' }, { date: '2026-03-15' }] }
    expect(lastTouchedAt(t)).toBe('2026-03-15')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- time`
Expected: FAIL — cannot find module `./time`.

- [ ] **Step 3: Write the implementation**

Create `src/domain/time.ts`:
```ts
import type { ISODate, Thread } from './types'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round(Math.abs(toUTC(a) - toUTC(b)) / MS_PER_DAY)
}

/** How many whole weeks before `now` the date `then` falls (0 = this week). */
export function weeksAgoIndex(now: ISODate, then: ISODate): number {
  return Math.floor(daysBetween(now, then) / 7)
}

export function lastTouchedAt(thread: Thread): ISODate {
  if (thread.touches.length === 0) return thread.createdAt
  return thread.touches
    .map((t) => t.date)
    .reduce((latest, d) => (toUTC(d) > toUTC(latest) ? d : latest))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- time`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/time.ts src/domain/time.test.ts
git commit -m "feat: time helpers (daysBetween, weeksAgoIndex, lastTouchedAt)"
```

---

## Task 6: Derived computations — `raiseNext`

**Files:**
- Create: `src/domain/compute.ts`
- Test: `src/domain/compute.test.ts`

`raiseNext` ranks a person's *active* threads by how overdue they are, then returns the top N annotated with the reason they surfaced.

- [ ] **Step 1: Write the failing test**

Create `src/domain/compute.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { raiseNext } from './compute'
import type { AppData, Thread } from './types'

const areas = [
  { id: 'career', name: 'Career', cadenceDays: 28 },
  { id: 'wellbeing', name: 'Wellbeing', cadenceDays: 7 },
]
const person = { id: 'p1', name: 'Alex', cadenceDays: 7, picture: [] }

function thread(over: Partial<Thread>): Thread {
  return {
    id: 'x', personId: 'p1', area: 'career', type: 'topic',
    title: 't', state: 'active', createdAt: '2026-01-01', touches: [], ...over,
  }
}

const NOW = '2026-05-31'

describe('raiseNext', () => {
  it('ranks the most overdue active thread first', () => {
    const data: AppData = {
      people: [person], areas,
      threads: [
        thread({ id: 'fresh', area: 'wellbeing', touches: [{ date: '2026-05-28' }] }),
        thread({ id: 'stale', area: 'career', touches: [{ date: '2026-03-01' }] }),
      ],
    }
    const result = raiseNext(data, 'p1', NOW, 3)
    expect(result[0].thread.id).toBe('stale')
  })

  it('excludes resolved and snoozed threads', () => {
    const data: AppData = {
      people: [person], areas,
      threads: [
        thread({ id: 'done', state: 'resolved', touches: [{ date: '2026-01-01' }] }),
        thread({ id: 'snoozed', state: 'snoozed', snoozedUntil: '2026-12-01', touches: [{ date: '2026-01-01' }] }),
        thread({ id: 'live', touches: [{ date: '2026-01-01' }] }),
      ],
    }
    const result = raiseNext(data, 'p1', NOW, 5)
    expect(result.map((r) => r.thread.id)).toEqual(['live'])
  })

  it('annotates an overdue thread with a cadence reason', () => {
    const data: AppData = {
      people: [person], areas,
      threads: [thread({ id: 'stale', area: 'career', touches: [{ date: '2026-03-01' }] })],
    }
    const [top] = raiseNext(data, 'p1', NOW, 3)
    expect(top.reason).toMatch(/career/i)
  })

  it('limits to N results', () => {
    const data: AppData = {
      people: [person], areas,
      threads: [1, 2, 3, 4].map((n) => thread({ id: `t${n}`, touches: [{ date: '2026-01-01' }] })),
    }
    expect(raiseNext(data, 'p1', NOW, 2)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compute`
Expected: FAIL — cannot find module `./compute`.

- [ ] **Step 3: Write the implementation**

Create `src/domain/compute.ts`:
```ts
import type { AppData, AreaId, PersonId, Thread } from './types'
import { daysBetween, lastTouchedAt } from './time'
import type { ISODate } from './types'

export interface RaiseItem {
  thread: Thread
  score: number
  reason: string
}

function areaCadence(data: AppData, areaId: AreaId): number {
  return data.areas.find((a) => a.id === areaId)?.cadenceDays ?? 7
}

function areaName(data: AppData, areaId: AreaId): string {
  return data.areas.find((a) => a.id === areaId)?.name ?? areaId
}

/** Overdue ratio: >1 means past cadence. */
function overdueRatio(data: AppData, thread: Thread, now: ISODate): number {
  const idle = daysBetween(now, lastTouchedAt(thread))
  return idle / areaCadence(data, thread.area)
}

export function raiseNext(
  data: AppData,
  personId: PersonId,
  now: ISODate,
  limit: number,
): RaiseItem[] {
  return data.threads
    .filter((t) => t.personId === personId && t.state === 'active')
    .map((thread) => {
      const ratio = overdueRatio(data, thread, now)
      const commitmentBoost = thread.type === 'commitment' && thread.owner === 'you' ? 0.5 : 0
      const score = ratio + commitmentBoost
      const reason =
        ratio >= 1
          ? `${areaName(data, thread.area)} is past its cadence`
          : thread.type === 'commitment'
            ? 'Open commitment'
            : 'Active thread'
      return { thread, score, reason }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compute`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.ts src/domain/compute.test.ts
git commit -m "feat: raiseNext ranking"
```

---

## Task 7: Derived computations — `areaCoverage`

**Files:**
- Modify: `src/domain/compute.ts`, `src/domain/compute.test.ts`

`areaCoverage` returns, per area, a 12-week touched/not grid plus last-touched and an overdue flag.

- [ ] **Step 1: Add the failing test**

Append to `src/domain/compute.test.ts`:
```ts
import { areaCoverage } from './compute'

describe('areaCoverage', () => {
  const areas2 = [
    { id: 'career', name: 'Career', cadenceDays: 28 },
    { id: 'wellbeing', name: 'Wellbeing', cadenceDays: 7 },
  ]
  const person2 = { id: 'p1', name: 'Alex', cadenceDays: 7, picture: [] }
  const NOW2 = '2026-05-31'

  it('returns one row per area with a 12-week grid', () => {
    const data = {
      people: [person2], areas: areas2,
      threads: [
        thread({ id: 'c', area: 'career', touches: [{ date: '2026-05-24' }] }),
      ],
    }
    const rows = areaCoverage(data, 'p1', NOW2, 12)
    expect(rows).toHaveLength(2)
    expect(rows[0].weeks).toHaveLength(12)
  })

  it('marks the week of a touch as covered', () => {
    const data = {
      people: [person2], areas: areas2,
      threads: [thread({ id: 'c', area: 'career', touches: [{ date: '2026-05-24' }] })],
    }
    const career = areaCoverage(data, 'p1', NOW2, 12).find((r) => r.area.id === 'career')!
    // 2026-05-24 is 1 week before 2026-05-31
    expect(career.weeks[1]).toBe(true)
    expect(career.weeks[5]).toBe(false)
  })

  it('flags an area as overdue when last touch exceeds its cadence', () => {
    const data = {
      people: [person2], areas: areas2,
      threads: [thread({ id: 'c', area: 'career', touches: [{ date: '2026-03-01' }] })],
    }
    const career = areaCoverage(data, 'p1', NOW2, 12).find((r) => r.area.id === 'career')!
    expect(career.overdue).toBe(true)
  })

  it('treats an area with no threads as overdue with null lastTouched', () => {
    const data = { people: [person2], areas: areas2, threads: [] }
    const wb = areaCoverage(data, 'p1', NOW2, 12).find((r) => r.area.id === 'wellbeing')!
    expect(wb.lastTouched).toBeNull()
    expect(wb.overdue).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compute`
Expected: FAIL — `areaCoverage` is not exported.

- [ ] **Step 3: Add the implementation**

Append to `src/domain/compute.ts`:
```ts
import { weeksAgoIndex } from './time'

export interface CoverageRow {
  area: AppData['areas'][number]
  weeks: boolean[] // index 0 = current week, increasing = older
  lastTouched: ISODate | null
  overdue: boolean
}

export function areaCoverage(
  data: AppData,
  personId: PersonId,
  now: ISODate,
  weekCount: number,
): CoverageRow[] {
  const personThreads = data.threads.filter((t) => t.personId === personId)
  return data.areas.map((area) => {
    const touchDates = personThreads
      .filter((t) => t.area === area.id)
      .flatMap((t) => t.touches.map((touch) => touch.date))

    const weeks = Array.from({ length: weekCount }, () => false)
    let lastTouched: ISODate | null = null
    for (const date of touchDates) {
      const idx = weeksAgoIndex(now, date)
      if (idx >= 0 && idx < weekCount) weeks[idx] = true
      if (lastTouched === null || daysBetween(now, date) < daysBetween(now, lastTouched)) {
        lastTouched = date
      }
    }
    const overdue =
      lastTouched === null || daysBetween(now, lastTouched) > area.cadenceDays
    return { area, weeks, lastTouched, overdue }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compute`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.ts src/domain/compute.test.ts
git commit -m "feat: areaCoverage computation"
```

---

## Task 8: Derived computations — `blindSpots` and `groupThreads`

**Files:**
- Modify: `src/domain/compute.ts`, `src/domain/compute.test.ts`

`blindSpots` finds a person's picture points whose area has no active thread. `groupThreads` splits a person's active threads into open-loops / commitments / and returns recently resolved.

- [ ] **Step 1: Add the failing test**

Append to `src/domain/compute.test.ts`:
```ts
import { blindSpots, groupThreads } from './compute'

describe('blindSpots', () => {
  const areas3 = [
    { id: 'career', name: 'Career', cadenceDays: 28 },
    { id: 'wellbeing', name: 'Wellbeing', cadenceDays: 7 },
  ]
  it('flags a picture point whose area has no active thread', () => {
    const person3 = {
      id: 'p1', name: 'Alex', cadenceDays: 7,
      picture: [{ text: 'mentor a junior', area: 'career' }],
    }
    const data = { people: [person3], areas: areas3, threads: [] }
    const spots = blindSpots(data, 'p1')
    expect(spots).toHaveLength(1)
    expect(spots[0].text).toBe('mentor a junior')
  })

  it('does not flag a picture point whose area has an active thread', () => {
    const person3 = {
      id: 'p1', name: 'Alex', cadenceDays: 7,
      picture: [{ text: 'mentor a junior', area: 'career' }],
    }
    const data = {
      people: [person3], areas: areas3,
      threads: [thread({ id: 'c', area: 'career', state: 'active' })],
    }
    expect(blindSpots(data, 'p1')).toHaveLength(0)
  })
})

describe('groupThreads', () => {
  const areas3 = [{ id: 'career', name: 'Career', cadenceDays: 28 }]
  const person3 = { id: 'p1', name: 'Alex', cadenceDays: 7, picture: [] }
  it('splits active open-loops and commitments and lists resolved', () => {
    const data = {
      people: [person3], areas: areas3,
      threads: [
        thread({ id: 'loop', type: 'open-loop', state: 'active' }),
        thread({ id: 'commit', type: 'commitment', owner: 'you', state: 'active' }),
        thread({ id: 'done', type: 'topic', state: 'resolved' }),
      ],
    }
    const g = groupThreads(data, 'p1')
    expect(g.openLoops.map((t) => t.id)).toEqual(['loop'])
    expect(g.commitments.map((t) => t.id)).toEqual(['commit'])
    expect(g.resolved.map((t) => t.id)).toEqual(['done'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compute`
Expected: FAIL — `blindSpots` / `groupThreads` not exported.

- [ ] **Step 3: Add the implementation**

Append to `src/domain/compute.ts`:
```ts
import type { PicturePoint } from './types'

export function blindSpots(data: AppData, personId: PersonId): PicturePoint[] {
  const person = data.people.find((p) => p.id === personId)
  if (!person) return []
  const activeAreas = new Set(
    data.threads
      .filter((t) => t.personId === personId && t.state === 'active')
      .map((t) => t.area),
  )
  return person.picture.filter((pt) => pt.area !== undefined && !activeAreas.has(pt.area))
}

export interface ThreadGroups {
  openLoops: Thread[]
  commitments: Thread[]
  resolved: Thread[]
}

export function groupThreads(data: AppData, personId: PersonId): ThreadGroups {
  const mine = data.threads.filter((t) => t.personId === personId)
  return {
    openLoops: mine.filter((t) => t.state === 'active' && t.type === 'open-loop'),
    commitments: mine.filter((t) => t.state === 'active' && t.type === 'commitment'),
    resolved: mine.filter((t) => t.state === 'resolved'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compute`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/compute.ts src/domain/compute.test.ts
git commit -m "feat: blindSpots and groupThreads"
```

---

## Task 9: Seed data

**Files:**
- Create: `src/storage/seed.ts`

- [ ] **Step 1: Write the seed**

Create `src/storage/seed.ts`:
```ts
import type { AppData } from '../domain/types'

export const DEFAULT_AREAS = [
  { id: 'career', name: 'Career & growth', cadenceDays: 28 },
  { id: 'wellbeing', name: 'Wellbeing & workload', cadenceDays: 7 },
  { id: 'feedback', name: 'Performance & feedback', cadenceDays: 21 },
  { id: 'goals', name: 'Goals & priorities', cadenceDays: 14 },
  { id: 'team', name: 'Team & relationships', cadenceDays: 21 },
  { id: 'recognition', name: 'Recognition', cadenceDays: 28 },
]

export function seedData(): AppData {
  return {
    areas: DEFAULT_AREAS,
    people: [
      {
        id: 'alex', name: 'Alex', cadenceDays: 7,
        picture: [
          { text: 'Aiming for the staff engineer path', area: 'career' },
          { text: 'Wants to mentor a junior', area: 'career' },
          { text: 'History of overloading on infra work', area: 'wellbeing' },
        ],
      },
      { id: 'priya', name: 'Priya', cadenceDays: 7, picture: [
        { text: 'New to the team, ramping up', area: 'goals' },
      ] },
      { id: 'sam', name: 'Sam', cadenceDays: 14, picture: [] },
    ],
    threads: [
      {
        id: 'alex-promo', personId: 'alex', area: 'career', type: 'open-loop',
        title: 'Promo timeline check-in', state: 'active',
        createdAt: '2026-03-01', touches: [{ date: '2026-04-10' }],
      },
      {
        id: 'alex-infra', personId: 'alex', area: 'wellbeing', type: 'open-loop',
        title: 'Still feeling stretched on infra?', state: 'active',
        createdAt: '2026-05-01', touches: [{ date: '2026-05-17' }],
      },
      {
        id: 'alex-rubric', personId: 'alex', area: 'career', type: 'commitment',
        owner: 'you', title: 'Share the promo rubric', state: 'active',
        createdAt: '2026-05-17', touches: [],
      },
      {
        id: 'alex-oncall', personId: 'alex', area: 'wellbeing', type: 'topic',
        title: 'Offload on-call rotation', state: 'resolved',
        createdAt: '2026-04-01', touches: [{ date: '2026-04-10' }, { date: '2026-04-24' }],
      },
      {
        id: 'priya-ramp', personId: 'priya', area: 'goals', type: 'topic',
        title: 'First 90 days goals', state: 'active',
        createdAt: '2026-05-20', touches: [{ date: '2026-05-25' }],
      },
    ],
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/storage/seed.ts
git commit -m "feat: seed data"
```

---

## Task 10: Storage module

**Files:**
- Create: `src/storage/store.ts`
- Test: `src/storage/store.test.ts`

A thin `localStorage`-backed store behind an interface. Tests inject an in-memory storage so they don't need a browser.

- [ ] **Step 1: Write the failing test**

Create `src/storage/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, type KeyValue } from './store'

function memoryKV(): KeyValue {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
  }
}

describe('store', () => {
  let kv: KeyValue
  beforeEach(() => { kv = memoryKV() })

  it('seeds on first load when storage is empty', () => {
    const store = createStore(kv)
    const data = store.load()
    expect(data.people.length).toBeGreaterThan(0)
    expect(data.areas.length).toBeGreaterThan(0)
  })

  it('persists saved data across new store instances', () => {
    const store = createStore(kv)
    const data = store.load()
    data.people.push({ id: 'new', name: 'New', cadenceDays: 7, picture: [] })
    store.save(data)

    const reloaded = createStore(kv).load()
    expect(reloaded.people.some((p) => p.id === 'new')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store`
Expected: FAIL — cannot find module `./store`.

- [ ] **Step 3: Write the implementation**

Create `src/storage/store.ts`:
```ts
import type { AppData } from '../domain/types'
import { seedData } from './seed'

export interface KeyValue {
  get(key: string): string | null
  set(key: string, value: string): void
}

const KEY = 'oneonone.data.v1'

export interface Store {
  load(): AppData
  save(data: AppData): void
}

const browserKV: KeyValue = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
}

export function createStore(kv: KeyValue = browserKV): Store {
  return {
    load(): AppData {
      const raw = kv.get(KEY)
      if (!raw) {
        const seeded = seedData()
        kv.set(KEY, JSON.stringify(seeded))
        return seeded
      }
      return JSON.parse(raw) as AppData
    },
    save(data: AppData): void {
      kv.set(KEY, JSON.stringify(data))
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- store`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/store.ts src/storage/store.test.ts
git commit -m "feat: localStorage-backed store with injectable KV"
```

---

## Task 11: App state hook

**Files:**
- Create: `src/state/useAppState.ts`

A React hook that loads the store once and exposes data plus the mutations the UI needs: add a thread, log a touch, snooze, resolve.

- [ ] **Step 1: Write the hook**

Create `src/state/useAppState.ts`:
```ts
import { useState, useMemo, useCallback } from 'react'
import type { AppData, Thread, ThreadType, AreaId, PersonId, CommitmentOwner } from '../domain/types'
import { createStore } from '../storage/store'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface NewThreadInput {
  personId: PersonId
  area: AreaId
  type: ThreadType
  title: string
  owner?: CommitmentOwner
}

export function useAppState() {
  const store = useMemo(() => createStore(), [])
  const [data, setData] = useState<AppData>(() => store.load())

  const commit = useCallback((next: AppData) => {
    store.save(next)
    setData({ ...next })
  }, [store])

  const updateThread = useCallback((id: string, fn: (t: Thread) => Thread) => {
    commit({ ...data, threads: data.threads.map((t) => (t.id === id ? fn(t) : t)) })
  }, [data, commit])

  const addThread = useCallback((input: NewThreadInput) => {
    const thread: Thread = {
      id: `${input.personId}-${Date.now()}`,
      personId: input.personId,
      area: input.area,
      type: input.type,
      title: input.title,
      owner: input.type === 'commitment' ? (input.owner ?? 'you') : undefined,
      state: 'active',
      createdAt: todayISO(),
      touches: [],
    }
    commit({ ...data, threads: [...data.threads, thread] })
  }, [data, commit])

  const markDiscussed = useCallback((id: string) => {
    updateThread(id, (t) => ({ ...t, touches: [...t.touches, { date: todayISO() }] }))
  }, [updateThread])

  const snooze = useCallback((id: string, until: string) => {
    updateThread(id, (t) => ({ ...t, state: 'snoozed', snoozedUntil: until }))
  }, [updateThread])

  const resolve = useCallback((id: string) => {
    updateThread(id, (t) => ({ ...t, state: 'resolved' }))
  }, [updateThread])

  return { data, addThread, markDiscussed, snooze, resolve }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/useAppState.ts
git commit -m "feat: useAppState hook with thread mutations"
```

---

## Task 12: QuickCapture component

**Files:**
- Create: `src/ui/QuickCapture.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/QuickCapture.tsx`:
```tsx
import { useState } from 'react'
import type { Area, ThreadType, AreaId } from '../domain/types'
import type { NewThreadInput } from '../state/useAppState'

const TYPES: ThreadType[] = ['topic', 'open-loop', 'commitment']

export function QuickCapture({
  personId, areas, onAdd,
}: {
  personId: string
  areas: Area[]
  onAdd: (input: NewThreadInput) => void
}) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaId>(areas[0]?.id ?? '')
  const [type, setType] = useState<ThreadType>('topic')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ personId, area, type, title: title.trim() })
    setTitle('')
    setType('topic')
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capture a thread…"
        className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-slate-300 text-sm"
      />
      <select value={area} onChange={(e) => setArea(e.target.value)} className="px-2 py-2 rounded-md border border-slate-300 text-sm">
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value as ThreadType)} className="px-2 py-2 rounded-md border border-slate-300 text-sm">
        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium">Add</button>
    </form>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/QuickCapture.tsx
git commit -m "feat: QuickCapture component"
```

---

## Task 13: RaiseNext component

**Files:**
- Create: `src/ui/RaiseNext.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/RaiseNext.tsx`:
```tsx
import type { RaiseItem } from '../domain/compute'
import type { PicturePoint } from '../domain/types'

const BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  med: 'border-l-amber-500',
  low: 'border-l-blue-500',
}

function band(score: number): 'high' | 'med' | 'low' {
  if (score >= 1) return 'high'
  if (score >= 0.5) return 'med'
  return 'low'
}

export function RaiseNext({
  items, blindSpots, onDiscussed, onSnooze, onResolve,
}: {
  items: RaiseItem[]
  blindSpots: PicturePoint[]
  onDiscussed: (id: string) => void
  onSnooze: (id: string) => void
  onResolve: (id: string) => void
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Raise next</h3>
      {items.length === 0 && <p className="text-sm text-slate-400">Nothing pressing — you're on top of things.</p>}
      {items.map(({ thread, score, reason }) => (
        <div key={thread.id} className={`bg-white border border-slate-200 border-l-4 ${BORDER[band(score)]} rounded-md p-3`}>
          <div className="font-medium text-slate-800">{thread.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{thread.type} · {reason}</div>
          <div className="flex gap-3 mt-2 text-xs">
            <button onClick={() => onDiscussed(thread.id)} className="text-green-700 hover:underline">✓ discussed</button>
            <button onClick={() => onSnooze(thread.id)} className="text-slate-500 hover:underline">💤 snooze</button>
            <button onClick={() => onResolve(thread.id)} className="text-blue-700 hover:underline">✔ resolve</button>
          </div>
        </div>
      ))}
      {blindSpots.map((pt, i) => (
        <div key={`bs-${i}`} className="bg-purple-50 border border-dashed border-purple-400 rounded-md p-3">
          <div className="font-medium text-purple-800">💡 Blind spot</div>
          <div className="text-xs text-slate-600 mt-0.5">"{pt.text}" has no active thread — ask about it?</div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/RaiseNext.tsx
git commit -m "feat: RaiseNext component"
```

---

## Task 14: AreaCoverage component

**Files:**
- Create: `src/ui/AreaCoverage.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/AreaCoverage.tsx`:
```tsx
import type { CoverageRow } from '../domain/compute'

export function AreaCoverage({ rows }: { rows: CoverageRow[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area coverage · last 12 weeks</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.area.id} className="border-b border-slate-100">
              <td className="py-1.5 pr-3 text-slate-700 whitespace-nowrap">{row.area.name}</td>
              <td className="py-1.5 font-mono tracking-wider">
                {/* render oldest → newest for left-to-right time */}
                {[...row.weeks].reverse().map((hit, i) => (
                  <span key={i} className={hit ? 'text-emerald-600' : 'text-slate-300'}>▰</span>
                ))}
              </td>
              <td className={`py-1.5 pl-3 text-right whitespace-nowrap ${row.overdue ? 'text-red-600' : 'text-slate-400'}`}>
                {row.overdue ? '⚠ overdue' : 'ok'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/AreaCoverage.tsx
git commit -m "feat: AreaCoverage component"
```

---

## Task 15: ThreadGroups component

**Files:**
- Create: `src/ui/ThreadGroups.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/ThreadGroups.tsx`:
```tsx
import type { ThreadGroups as Groups } from '../domain/compute'

export function ThreadGroups({ groups }: { groups: Groups }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
      <Column title={`Open loops (${groups.openLoops.length})`}>
        {groups.openLoops.map((t) => (
          <li key={t.id} className="text-slate-700">▸ {t.title}</li>
        ))}
      </Column>
      <Column title="Commitments">
        {groups.commitments.map((t) => (
          <li key={t.id} className="text-slate-700">☐ {t.owner === 'you' ? 'You' : 'Them'}: {t.title}</li>
        ))}
      </Column>
      <Column title="Recently resolved">
        {groups.resolved.map((t) => (
          <li key={t.id} className="text-slate-400">✔ {t.title}</li>
        ))}
      </Column>
    </section>
  )
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{title}</h4>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ThreadGroups.tsx
git commit -m "feat: ThreadGroups component"
```

---

## Task 16: PeopleSwitcher component

**Files:**
- Create: `src/ui/PeopleSwitcher.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/PeopleSwitcher.tsx`:
```tsx
import type { Person } from '../domain/types'

export function PeopleSwitcher({
  people, selectedId, overdueCounts, onSelect,
}: {
  people: Person[]
  selectedId: string
  overdueCounts: Record<string, number>
  onSelect: (id: string) => void
}) {
  return (
    <nav className="w-48 shrink-0 border-r border-slate-200 p-3 space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Your people</h2>
      {people.map((p) => {
        const overdue = overdueCounts[p.id] ?? 0
        const selected = p.id === selectedId
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between items-center ${selected ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            <span>{p.name}</span>
            {overdue > 0 && <span className="text-xs text-red-600">{overdue} ⚠</span>}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PeopleSwitcher.tsx
git commit -m "feat: PeopleSwitcher component"
```

---

## Task 17: PersonScreen component

**Files:**
- Create: `src/ui/PersonScreen.tsx`

Assembles QuickCapture + RaiseNext + AreaCoverage + ThreadGroups for one person, wiring the derived computations.

- [ ] **Step 1: Write the component**

Create `src/ui/PersonScreen.tsx`:
```tsx
import type { AppData } from '../domain/types'
import { raiseNext, areaCoverage, blindSpots, groupThreads } from '../domain/compute'
import { todayISO, type NewThreadInput } from '../state/useAppState'
import { QuickCapture } from './QuickCapture'
import { RaiseNext } from './RaiseNext'
import { AreaCoverage } from './AreaCoverage'
import { ThreadGroups } from './ThreadGroups'

export function PersonScreen({
  data, personId, onAdd, onDiscussed, onSnooze, onResolve,
}: {
  data: AppData
  personId: string
  onAdd: (input: NewThreadInput) => void
  onDiscussed: (id: string) => void
  onSnooze: (id: string) => void
  onResolve: (id: string) => void
}) {
  const person = data.people.find((p) => p.id === personId)
  if (!person) return null
  const now = todayISO()

  const items = raiseNext(data, personId, now, 3)
  const coverage = areaCoverage(data, personId, now, 12)
  const spots = blindSpots(data, personId)
  const groups = groupThreads(data, personId)

  const snoozeOneWeek = (id: string) => onSnooze(id)

  return (
    <div className="flex-1 p-6 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{person.name}</h1>
        <p className="text-sm text-slate-500">1:1 every {person.cadenceDays} days</p>
      </header>
      <QuickCapture personId={personId} areas={data.areas} onAdd={onAdd} />
      <RaiseNext items={items} blindSpots={spots} onDiscussed={onDiscussed} onSnooze={snoozeOneWeek} onResolve={onResolve} />
      <AreaCoverage rows={coverage} />
      <ThreadGroups groups={groups} />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PersonScreen.tsx
git commit -m "feat: PersonScreen assembling the per-person surface"
```

---

## Task 18: App shell wiring it together

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx` (verify)

`snooze` needs a concrete "until" date; compute one week ahead here.

- [ ] **Step 1: Write `App.tsx`**

Replace `src/App.tsx`:
```tsx
import { useState } from 'react'
import { useAppState } from './state/useAppState'
import { areaCoverage } from './domain/compute'
import { todayISO } from './state/useAppState'
import { PeopleSwitcher } from './ui/PeopleSwitcher'
import { PersonScreen } from './ui/PersonScreen'

function oneWeekFrom(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

export default function App() {
  const { data, addThread, markDiscussed, snooze, resolve } = useAppState()
  const [selectedId, setSelectedId] = useState(data.people[0]?.id ?? '')
  const now = todayISO()

  const overdueCounts: Record<string, number> = {}
  for (const p of data.people) {
    overdueCounts[p.id] = areaCoverage(data, p.id, now, 12).filter((r) => r.overdue).length
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <PeopleSwitcher
        people={data.people}
        selectedId={selectedId}
        overdueCounts={overdueCounts}
        onSelect={setSelectedId}
      />
      <PersonScreen
        data={data}
        personId={selectedId}
        onAdd={addThread}
        onDiscussed={markDiscussed}
        onSnooze={(id) => snooze(id, oneWeekFrom(now))}
        onResolve={resolve}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify `main.tsx` imports `index.css`**

Confirm `src/main.tsx` contains `import './index.css'`. If missing, add it after the React imports.

- [ ] **Step 3: Type-check and run the full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all domain/storage tests pass.

- [ ] **Step 4: Manual smoke test in the browser**

Run: `npm run dev -- --port 5174`
Verify, then Ctrl-C:
- Three people in the left rail (Alex shows a ⚠ count).
- Selecting Alex shows Raise next (promo timeline ranked high), the coverage table, open loops, the "Share the promo rubric" commitment, and the resolved on-call item.
- Typing a thread in QuickCapture and clicking Add makes it appear; "✓ discussed" updates coverage; reloading the page preserves changes (localStorage).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire App shell — people switcher + person screen"
```

---

## Task 19: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:
```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

## Self-Review Notes

- **Spec coverage:** Thread/Person/Area/Touch model → Task 4. raiseNext → Task 6. areaCoverage → Task 7. blindSpots + groupThreads → Task 8. localStorage persistence behind interface → Task 10. Seed data → Task 9. One per-person surface (quick-capture, raise-next woven in, coverage, groups) → Tasks 12–18. People switcher → Task 16. Out-of-scope items (auth, integrations, live note-taking, report-side, AI generation) are intentionally absent.
- **Cadence "raise next" + over-time view on one screen:** satisfied by PersonScreen (Task 17) rendering RaiseNext above AreaCoverage.
- **Type consistency:** `RaiseItem`, `CoverageRow`, `ThreadGroups`, `NewThreadInput`, `KeyValue`, `Store` are defined once and imported where used. `todayISO` defined in `useAppState.ts` and reused. `snooze(id, until)` always called with a computed date in App.
- **Testing concentration:** domain (`time`, `compute`) and `store` carry the unit tests, per the spec's testability section; UI is verified via the manual smoke test in Task 18.
