import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, type KeyValue } from './store'

function memoryKV(): KeyValue {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
  }
}

describe('store', () => {
  let kv: KeyValue
  beforeEach(() => { kv = memoryKV() })

  it('seeds on first load when storage is empty', () => {
    const store = createStore(kv)
    const data = store.load()
    expect(data.people.length).toBeGreaterThan(0)
    expect(data.areas.length).toBeGreaterThan(0)
  })

  it('persists saved data across new store instances', () => {
    const store = createStore(kv)
    const data = store.load()
    data.people.push({ id: 'new', name: 'New', cadenceDays: 7, picture: [] })
    store.save(data)

    const reloaded = createStore(kv).load()
    expect(reloaded.people.some((p) => p.id === 'new')).toBe(true)
  })
})
