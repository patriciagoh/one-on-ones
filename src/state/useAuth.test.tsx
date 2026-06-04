// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import type { AuthPort, Session } from "../storage/auth";

function fakePort(session: Session | null): AuthPort {
  return {
    getSession: async () => session,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    onAuthChange: () => () => {},
  };
}

describe("useAuth", () => {
  it("resolves to 'anon' when there is no session", async () => {
    const { result } = renderHook(() => useAuth(fakePort(null)));
    expect(result.current.status).toBe("checking");
    await waitFor(() => expect(result.current.status).toBe("anon"));
    expect(result.current.session).toBeNull();
  });

  it("resolves to 'authed' when a session exists", async () => {
    const { result } = renderHook(() => useAuth(fakePort({ userId: "u1" })));
    await waitFor(() => expect(result.current.status).toBe("authed"));
    expect(result.current.session).toEqual({ userId: "u1" });
  });

  it("lets onAuthChange override a stale getSession result", async () => {
    const port: AuthPort = {
      getSession: async () => null,                       // stale: says no session
      signIn: vi.fn(async () => {}),
      signOut: vi.fn(async () => {}),
      onAuthChange: (cb) => { cb({ userId: "u9" }); return () => {}; }, // fresh: authed
    };
    const { result } = renderHook(() => useAuth(port));
    await waitFor(() => expect(result.current.status).toBe("authed"));
    expect(result.current.session).toEqual({ userId: "u9" });
  });
});
