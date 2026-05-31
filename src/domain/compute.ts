import type { AppData, Area, AreaId, PersonId, Thread, PicturePoint, ISODate } from './types'
import { daysBetween, lastTouchedAt, weeksAgoIndex } from './time'

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

export interface CoverageRow {
  area: Area
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
      if (lastTouched === null || date > lastTouched) {
        lastTouched = date
      }
    }
    const overdue =
      lastTouched === null || daysBetween(now, lastTouched) > area.cadenceDays
    return { area, weeks, lastTouched, overdue }
  })
}

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

// Snoozed threads are intentionally excluded from all groups.
export function groupThreads(data: AppData, personId: PersonId): ThreadGroups {
  const mine = data.threads.filter((t) => t.personId === personId)
  return {
    openLoops: mine.filter((t) => t.state === 'active' && t.type === 'open-loop'),
    commitments: mine.filter((t) => t.state === 'active' && t.type === 'commitment'),
    resolved: mine.filter((t) => t.state === 'resolved'),
  }
}
