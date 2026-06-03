import type { AppData } from "../domain/types";
import { seedData } from "./seed";

export interface StoragePort {
  get(): string | null;
  set(value: string): void;
  remove(): void;
}

const KEY = "one-on-ones/v2";
export const SCHEMA_VERSION = 2;

export function browserPort(): StoragePort {
  return {
    get: () => localStorage.getItem(KEY),
    set: (v) => localStorage.setItem(KEY, v),
    remove: () => localStorage.removeItem(KEY),
  };
}

function migrate(raw: unknown): AppData {
  // v1 shape (threads/areas/people) is structurally incompatible with the
  // redesign; the prototype has no production data, so we reseed on any
  // non-v2 blob rather than attempt a lossy field-by-field port.
  const data = raw as Partial<AppData> | null;
  if (data && data.version === SCHEMA_VERSION && Array.isArray(data.people)) {
    return data as AppData;
  }
  return seedData();
}

export interface Store {
  load(): AppData;
  save(data: AppData): void;
  reset(): void;
}

export function createStore(port: StoragePort = browserPort()): Store {
  return {
    load() {
      const raw = port.get();
      const parsed = raw ? safeParse(raw) : null;
      const data = migrate(parsed);
      if (!raw) port.set(JSON.stringify(data));
      return data;
    },
    save(data) { port.set(JSON.stringify(data)); },
    reset() { port.remove(); },
  };
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
