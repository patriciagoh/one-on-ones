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
