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
        key={selectedId}
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
