import { describe, it, expect } from "vitest";
import { scrubEvent, dropBreadcrumb, initObservability, captureError, isObservabilityActive } from "./sentry";

describe("scrubEvent", () => {
  it("strips request bodies, breadcrumb data, and extra", () => {
    const event = {
      message: "boom",
      request: { url: "/x", data: { people: [{ name: "Maya" }] } },
      breadcrumbs: [{ category: "fetch", data: { body: "secret" } }],
      extra: { appData: { people: [] } },
    };
    const out = scrubEvent({ ...event }) as typeof event;
    expect(out.request.data).toBeUndefined();
    expect(out.breadcrumbs[0].data).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.request.url).toBe("/x");
  });

  it("leaves a clean event intact", () => {
    const out = scrubEvent({ message: "boom", level: "error" }) as { message: string; level: string };
    expect(out.message).toBe("boom");
    expect(out.level).toBe("error");
  });

  it("strips event.user defensively", () => {
    const out = scrubEvent({ message: "x", user: { id: "u1", email: "a@b.co" } }) as { user?: unknown };
    expect(out.user).toBeUndefined();
  });
});

describe("dropBreadcrumb", () => {
  it("drops every breadcrumb (returns null) — DOM aria-labels can carry names/notes", () => {
    expect(dropBreadcrumb()).toBeNull();
  });
});

describe("initObservability (off by default)", () => {
  it("does not activate without VITE_SENTRY_DSN", async () => {
    await initObservability();
    expect(isObservabilityActive()).toBe(false);
  });
  it("captureError is a no-op (no throw) when inactive", () => {
    expect(() => captureError(new Error("x"), { op: "save" })).not.toThrow();
  });
});
