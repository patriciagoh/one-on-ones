import type { ReactNode } from 'react'
import type { ThreadGroups as Groups } from '../domain/compute'

export function ThreadGroups({ groups }: { groups: Groups }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
      <Column title={`Open loops (${groups.openLoops.length})`}>
        {groups.openLoops.map((t) => (
          <li key={t.id} className="text-slate-700">▸ {t.title}</li>
        ))}
      </Column>
      <Column title="Commitments">
        {groups.commitments.map((t) => (
          <li key={t.id} className="text-slate-700">☐ {t.owner === 'you' ? 'You' : 'Them'}: {t.title}</li>
        ))}
      </Column>
      <Column title="Recently resolved">
        {groups.resolved.map((t) => (
          <li key={t.id} className="text-slate-400">✔ {t.title}</li>
        ))}
      </Column>
    </section>
  )
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{title}</h4>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}
