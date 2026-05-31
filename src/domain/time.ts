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
