import { createContext } from "react";

/** Present only in the authenticated supabase build; null elsewhere (demo). */
export const AuthContext = createContext<{ signOut: () => void } | null>(null);
