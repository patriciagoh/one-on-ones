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
