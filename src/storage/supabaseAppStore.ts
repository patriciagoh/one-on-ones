import type { AppData } from "../domain/types";
import { normalizeAppData } from "../domain/normalize";
import { emptyData } from "./seed";
import type { AppStore } from "./appStore";
import { SCHEMA_VERSION } from "./store";

/**
 * Minimal persistence seam over a single per-user row. Implemented for real by
 * supabaseRowStore (Task 5); faked in tests. Keeps all network I/O out of the
 * adapter logic below so that logic is fully unit-testable.
 */
export interface RowStore {
  /** The current user's stored blob, or null if they have no row yet. */
  read(): Promise<unknown | null>;
  write(data: AppData): Promise<void>;
  remove(): Promise<void>;
}

function isAppData(v: unknown): v is AppData {
  const d = v as Partial<AppData> | null;
  return !!d && d.version === SCHEMA_VERSION && Array.isArray(d.people) && Array.isArray(d.templates);
}

/** AppStore backed by Supabase. New accounts bootstrap to empty-but-ready. */
export function supabaseAppStore(rows: RowStore): AppStore {
  return {
    load: async () => {
      const raw = await rows.read();
      if (raw === null) return normalizeAppData(emptyData());
      if (!isAppData(raw)) {
        // A row exists but isn't recognizable AppData. Refuse to load (and thus
        // refuse to let the next save overwrite it) — surface as a load error so
        // the original is preserved for inspection, never silently destroyed.
        throw new Error("Stored data is in an unrecognized format");
      }
      return normalizeAppData(raw);
    },
    save: async (data) => { await rows.write(data); },
    reset: async () => { await rows.remove(); },
  };
}
