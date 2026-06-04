import { describe, it, expect } from "vitest";
import { initialsOf, hueOf } from "./person";

describe("initialsOf", () => {
  it("uses the first letters of the first two words, uppercased", () => {
    expect(initialsOf("Maya Chen")).toBe("MC");
    expect(initialsOf("maya")).toBe("M");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("hueOf", () => {
  it("is deterministic and within 0–359", () => {
    const h = hueOf("Maya Chen");
    expect(h).toBe(hueOf("Maya Chen"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});
