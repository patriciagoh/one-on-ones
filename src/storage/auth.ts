import type { SupabaseClient } from "@supabase/supabase-js";

/** Reduced session — the app only needs the user's id (presence = authed). */
export interface Session {
  userId: string;
}

/** Testable seam over Supabase auth (mirrors RowStore). */
export interface AuthPort {
  getSession(): Promise<Session | null>;
  /** Throws on bad credentials. */
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Subscribe to auth changes; returns an unsubscribe fn. */
  onAuthChange(cb: (session: Session | null) => void): () => void;
}

function toSession(s: { user?: { id?: string } } | null | undefined): Session | null {
  return s?.user?.id ? { userId: s.user.id } : null;
}

export function supabaseAuth(client: SupabaseClient): AuthPort {
  return {
    getSession: async () => {
      const { data } = await client.auth.getSession();
      return toSession(data.session);
    },
    signIn: async (email, password) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await client.auth.signOut();
    },
    onAuthChange: (cb) => {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
  };
}
