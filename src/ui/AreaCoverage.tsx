import type { CoverageRow } from '../domain/compute'

export function AreaCoverage({ rows }: { rows: CoverageRow[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area coverage · last 12 weeks</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.area.id} className="border-b border-slate-100">
              <td className="py-1.5 pr-3 text-slate-700 whitespace-nowrap">{row.area.name}</td>
              <td className="py-1.5 font-mono tracking-wider">
                {/* render oldest → newest for left-to-right time */}
                {[...row.weeks].reverse().map((hit, i) => (
                  <span key={i} className={hit ? 'text-emerald-600' : 'text-slate-300'}>▰</span>
                ))}
              </td>
              <td className={`py-1.5 pl-3 text-right whitespace-nowrap ${row.overdue ? 'text-red-600' : 'text-slate-400'}`}>
                {row.overdue ? '⚠ overdue' : 'ok'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
