import { describe, it, expect } from "vitest";
import { daysBetween, daysSince, clamp, tenureMonths, tenureLabel } from "./time";

describe("time", () => {
  it("daysBetween counts whole days", () => {
    expect(daysBetween("2026-06-01", "2026-06-04")).toBe(3);
    expect(daysBetween("2026-06-04", "2026-06-01")).toBe(3); // absolute
  });
  it("daysSince(null) is Infinity", () => {
    expect(daysSince(null, "2026-06-04")).toBe(Infinity);
  });
  it("daysSince counts from iso to now", () => {
    expect(daysSince("2026-05-28", "2026-06-04")).toBe(7);
  });
  it("clamp bounds a number", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

describe("tenure", () => {
  it("tenureMonths counts whole months since joinedDate (clamped >= 0)", () => {
    expect(tenureMonths("2025-02-04", "2026-06-04")).toBe(15);
    expect(tenureMonths("2099-01-01", "2026-06-04")).toBe(0);
    expect(tenureMonths(null, "2026-06-04")).toBe(0);
  });
  it("tenureLabel formats years/months, with a fallback for no joinedDate", () => {
    expect(tenureLabel("2025-02-04", "2026-06-04")).toBe("1y 3m");
    expect(tenureLabel("2026-05-20", "2026-06-04")).toBe("<1m");
    expect(tenureLabel(null, "2026-06-04", 5)).toBe("5m");
    expect(tenureLabel(null, "2026-06-04")).toBe("—");   // no join date, no fallback
    expect(tenureLabel(null, "2026-06-04", 0)).toBe("—");
  });
});
