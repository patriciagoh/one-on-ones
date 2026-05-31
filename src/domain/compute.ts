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
