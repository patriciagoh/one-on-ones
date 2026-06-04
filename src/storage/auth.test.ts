import { describe, it, expect, vi } from "vitest";
import { supabaseAuth } from "./auth";

function fakeClient(over: Record<string, unknown> = {}) {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      ...over,
    },
  } as unknown as Parameters<typeof supabaseAuth>[0];
}

describe("supabaseAuth", () => {
  it("getSession maps a Supabase session to { userId } or null", async () => {
    const none = await supabaseAuth(fakeClient()).getSession();
    expect(none).toBeNull();
    const some = await supabaseAuth(
      fakeClient({ getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) }),
    ).getSession();
    expect(some).toEqual({ userId: "u1" });
  });

  it("signIn throws on bad credentials", async () => {
    const auth = supabaseAuth(
      fakeClient({ signInWithPassword: async () => ({ error: new Error("Invalid login credentials") }) }),
    );
    await expect(auth.signIn("a@b.co", "wrong")).rejects.toThrow();
  });

  it("signIn resolves on success", async () => {
    await expect(supabaseAuth(fakeClient()).signIn("a@b.co", "right")).resolves.toBeUndefined();
  });

  it("onAuthChange forwards mapped sessions and returns an unsubscribe", () => {
    let handler: (e: string, s: unknown) => void = () => {};
    const unsub = vi.fn();
    const auth = supabaseAuth(
      fakeClient({
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          handler = cb;
          return { data: { subscription: { unsubscribe: unsub } } };
        },
      }),
    );
    const seen: Array<{ userId: string } | null> = [];
    const off = auth.onAuthChange((s) => seen.push(s));
    handler("SIGNED_IN", { user: { id: "u2" } });
    handler("SIGNED_OUT", null);
    off();
    expect(seen).toEqual([{ userId: "u2" }, null]);
    expect(unsub).toHaveBeenCalled();
  });
});
