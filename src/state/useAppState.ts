import { useState, useMemo, useCallback } from 'react'
import type { AppData, Thread, ThreadType, AreaId, PersonId, CommitmentOwner } from '../domain/types'
import { createStore } from '../storage/store'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface NewThreadInput {
  personId: PersonId
  area: AreaId
  type: ThreadType
  title: string
  owner?: CommitmentOwner
}

export function useAppState() {
  const store = useMemo(() => createStore(), [])
  const [data, setData] = useState<AppData>(() => store.load())

  const commit = useCallback((next: AppData) => {
    store.save(next)
    setData({ ...next })
  }, [store])

  const updateThread = useCallback((id: string, fn: (t: Thread) => Thread) => {
    commit({ ...data, threads: data.threads.map((t) => (t.id === id ? fn(t) : t)) })
  }, [data, commit])

  const addThread = useCallback((input: NewThreadInput) => {
    const thread: Thread = {
      id: `${input.personId}-${Date.now()}`,
      personId: input.personId,
      area: input.area,
      type: input.type,
      title: input.title,
      owner: input.type === 'commitment' ? (input.owner ?? 'you') : undefined,
      state: 'active',
      createdAt: todayISO(),
      touches: [],
    }
    commit({ ...data, threads: [...data.threads, thread] })
  }, [data, commit])

  const markDiscussed = useCallback((id: string) => {
    updateThread(id, (t) => ({ ...t, touches: [...t.touches, { date: todayISO() }] }))
  }, [updateThread])

  const snooze = useCallback((id: string, until: string) => {
    updateThread(id, (t) => ({ ...t, state: 'snoozed', snoozedUntil: until }))
  }, [updateThread])

  const resolve = useCallback((id: string) => {
    updateThread(id, (t) => ({ ...t, state: 'resolved' }))
  }, [updateThread])

  return { data, addThread, markDiscussed, snooze, resolve }
}
