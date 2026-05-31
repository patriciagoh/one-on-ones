import { useState } from 'react'
import type { Area, ThreadType, AreaId } from '../domain/types'
import type { NewThreadInput } from '../state/useAppState'

const TYPES: ThreadType[] = ['topic', 'open-loop', 'commitment']

export function QuickCapture({
  personId, areas, onAdd,
}: {
  personId: string
  areas: Area[]
  onAdd: (input: NewThreadInput) => void
}) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaId>(areas[0]?.id ?? '')
  const [type, setType] = useState<ThreadType>('topic')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ personId, area, type, title: title.trim() })
    setTitle('')
    setType('topic')
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capture a thread…"
        aria-label="Thread title"
        className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-slate-300 text-sm"
      />
      <select value={area} onChange={(e) => setArea(e.target.value)} className="px-2 py-2 rounded-md border border-slate-300 text-sm">
        {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value as ThreadType)} className="px-2 py-2 rounded-md border border-slate-300 text-sm">
        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium">Add</button>
    </form>
  )
}
