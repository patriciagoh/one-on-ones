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

  it('boundary: 6 days ago → 0, 7 days ago → 1', () => {
    expect(weeksAgoIndex('2026-05-31', '2026-05-25')).toBe(0)
    expect(weeksAgoIndex('2026-05-31', '2026-05-24')).toBe(1)
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
