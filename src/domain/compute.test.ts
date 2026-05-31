import { describe, it, expect } from 'vitest'
import { raiseNext, areaCoverage, blindSpots, groupThreads } from './compute'
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
