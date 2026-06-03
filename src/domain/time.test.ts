import { describe, it, expect } from "vitest";
import { daysBetween, daysSince, clamp } from "./time";

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
