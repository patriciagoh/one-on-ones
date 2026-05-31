import type { AppData } from '../domain/types'
import { seedData } from './seed'

export interface KeyValue {
  get(key: string): string | null
  set(key: string, value: string): void
}

const KEY = 'oneonone.data.v1'

export interface Store {
  load(): AppData
  save(data: AppData): void
}

const browserKV: KeyValue = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
}

export function createStore(kv: KeyValue = browserKV): Store {
  return {
    load(): AppData {
      const raw = kv.get(KEY)
      if (!raw) {
        const seeded = seedData()
        kv.set(KEY, JSON.stringify(seeded))
        return seeded
      }
      return JSON.parse(raw) as AppData
    },
    save(data: AppData): void {
      kv.set(KEY, JSON.stringify(data))
    },
  }
}
