import { describe, it, expect } from "vitest";
import { stalenessTier, actionAgeTier } from "./compute";

describe("stalenessTier", () => {
  it("bands days into fresh/warming/stale/cold", () => {
    expect(stalenessTier(0)).toBe("fresh");
    expect(stalenessTier(10)).toBe("fresh");
    expect(stalenessTier(11)).toBe("warming");
    expect(stalenessTier(21)).toBe("warming");
    expect(stalenessTier(22)).toBe("stale");
    expect(stalenessTier(35)).toBe("stale");
    expect(stalenessTier(36)).toBe("cold");
    expect(stalenessTier(Infinity)).toBe("cold");
  });
});

describe("actionAgeTier", () => {
  it("bands action age", () => {
    expect(actionAgeTier(0)).toBe("fresh");
    expect(actionAgeTier(7)).toBe("fresh");
    expect(actionAgeTier(8)).toBe("warming");
    expect(actionAgeTier(21)).toBe("warming");
    expect(actionAgeTier(22)).toBe("cold");
  });
});
