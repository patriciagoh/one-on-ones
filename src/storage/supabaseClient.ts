import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "../domain/types";
import type { RowStore } from "./supabaseAppStore";

const TABLE = "app_data";

/** Reads the public Supabase URL + anon key from build-time env. */
export function createSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  }
  return createClient(url, anonKey);
}

/** RowStore bound to the currently authenticated user's row. */
export function supabaseRowStore(client: SupabaseClient): RowStore {
  async function userId(): Promise<string> {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("Not authenticated");
    return data.user.id;
  }
  return {
    read: async () => {
      const owner = await userId();
      const { data, error } = await client
        .from(TABLE).select("data").eq("owner", owner).maybeSingle();
      if (error) throw error;
      return data?.data ?? null;
    },
    write: async (appData: AppData) => {
      const owner = await userId();
      const { error } = await client
        .from(TABLE)
        .upsert({ owner, data: appData, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    remove: async () => {
      const owner = await userId();
      const { error } = await client.from(TABLE).delete().eq("owner", owner);
      if (error) throw error;
    },
  };
}
