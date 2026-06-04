import { useState } from "react";

interface LoginScreenProps {
  /** Throws on failure; the screen surfaces a generic error. */
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await onSubmit(email, password);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-paper text-ink font-sans px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm" aria-labelledby="login-heading">
        <h1 id="login-heading" className="font-mono font-bold text-lg text-ink">
          one-on-<span className="text-matcha-deep">ones</span>
        </h1>
        <p className="text-sm text-muted mt-1 mb-6">Log in to your 1:1s.</p>

        <label htmlFor="login-email" className="block text-sm font-medium">Email</label>
        <input
          id="login-email" type="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
        />

        <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
        <input
          id="login-password" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
        />

        {error && (
          <p role="alert" className="text-sm text-bad mb-4">Wrong email or password.</p>
        )}

        <button
          type="submit" disabled={busy}
          className="w-full px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
