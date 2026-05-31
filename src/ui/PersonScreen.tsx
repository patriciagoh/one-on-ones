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

  return (
    <div className="flex-1 p-6 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{person.name}</h1>
        <p className="text-sm text-slate-500">1:1 every {person.cadenceDays} days</p>
      </header>
      <QuickCapture personId={personId} areas={data.areas} onAdd={onAdd} />
      <RaiseNext items={items} blindSpots={spots} onDiscussed={onDiscussed} onSnooze={onSnooze} onResolve={onResolve} />
      <AreaCoverage rows={coverage} />
      <ThreadGroups groups={groups} />
    </div>
  )
}
