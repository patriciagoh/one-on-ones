import type { AppData } from "../domain/types";
import type { Store } from "./store";

/**
 * Async persistence interface the React hook consumes. localStorage and
 * Supabase both implement it; the async shape lets the same hook drive both.
 */
export interface AppStore {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  reset(): Promise<void>;
}

/** Wraps the synchronous localStorage-backed Store in the async interface. */
export function localAppStore(store: Store): AppStore {
  return {
    load: async () => store.load(),
    save: async (data) => store.save(data),
    reset: async () => store.reset(),
  };
}
