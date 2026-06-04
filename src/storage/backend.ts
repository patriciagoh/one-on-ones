import { createStore } from "./store";
import { localAppStore, type AppStore } from "./appStore";
import { supabaseAppStore } from "./supabaseAppStore";
import { createSupabaseClient, supabaseRowStore } from "./supabaseClient";
import { supabaseAuth, type AuthPort } from "./auth";

// One client shared by data + auth so the session set at login is the one the
// data layer reads. null in the local/demo build (no Supabase, no auth).
const client = import.meta.env.VITE_BACKEND === "supabase" ? createSupabaseClient() : null;

export const appStore: AppStore = client
  ? supabaseAppStore(supabaseRowStore(client))
  : localAppStore(createStore());

export const authPort: AuthPort | null = client ? supabaseAuth(client) : null;
