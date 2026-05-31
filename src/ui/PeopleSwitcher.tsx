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
