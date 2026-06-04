import type { AppData } from "../domain/types";
import { seedData } from "./seed";
import { normalizeAppData } from "../domain/normalize";

const KEY = "one-on-ones/v2";
const BACKUP_KEY = "one-on-ones/backup";
export const SCHEMA_VERSION = 2;

export interface StoragePort {
  get(): string | null;
  set(value: string): void;
  remove(): void;
  /** Optional: preserve a copy of a blob we're about to overwrite, so a bad
   *  or unexpected migration can never silently destroy real data. */
  backup?(value: string): void;
}

export function browserPort(): StoragePort {
  return {
    get: () => localStorage.getItem(KEY),
    set: (v) => localStorage.setItem(KEY, v),
    remove: () => localStorage.removeItem(KEY),
    backup: (v) => localStorage.setItem(BACKUP_KEY, v),
  };
}

function migrate(raw: unknown): AppData {
  // v1 shape (threads/areas/people) is structurally incompatible with the
  // redesign; the prototype has no production data, so we reseed on any
  // non-v2 blob rather than attempt a lossy field-by-field port.
  const data = raw as Partial<AppData> | null;
  if (data && data.version === SCHEMA_VERSION && Array.isArray(data.people) && Array.isArray(data.templates)) {
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
      const migrated = migrate(parsed);
      const data = normalizeAppData(migrated);
      const reseeded = parsed !== migrated; // migrate returned fresh seed (unrecognized or unparseable blob)
      if (raw && reseeded) port.backup?.(raw); // raw was non-null but unrecognized — preserve it before overwriting
      if (!raw || reseeded) port.set(JSON.stringify(data));
      return data;
    },
    save(data) { port.set(JSON.stringify(data)); },
    reset() { port.remove(); },
  };
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
