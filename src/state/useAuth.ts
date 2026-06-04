import { useCallback, useEffect, useState } from "react";
import type { AuthPort, Session } from "../storage/auth";

export type AuthStatus = "checking" | "anon" | "authed";

export function useAuth(port: AuthPort) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    let authoritative = false; // set once onAuthChange fires; it is the source of truth
    const settle = (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      setStatus(s ? "authed" : "anon");
    };
    port
      .getSession()
      .then((s) => { if (!authoritative) settle(s); })
      .catch(() => { if (!authoritative) settle(null); });
    const unsub = port.onAuthChange((s) => { authoritative = true; settle(s); });
    return () => { alive = false; unsub(); };
  }, [port]);

  const signIn = useCallback((email: string, password: string) => port.signIn(email, password), [port]);
  const signOut = useCallback(() => port.signOut(), [port]);

  return { status, session, signIn, signOut };
}
