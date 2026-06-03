import { describe, it, expect } from "vitest";
import { stalenessTier, actionAgeTier, balanceHealth } from "./compute";

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

describe("balanceHealth", () => {
  it("0 share is no-data", () => {
    expect(balanceHealth(0)).toEqual({ tier: "none", label: "No data" });
  });
  it("bands the report's airtime share", () => {
    expect(balanceHealth(22)).toEqual({ tier: "bad", label: "You're driving" });
    expect(balanceHealth(39)).toEqual({ tier: "bad", label: "You're driving" });
    expect(balanceHealth(40)).toEqual({ tier: "warn", label: "Manager-heavy" });
    expect(balanceHealth(54)).toEqual({ tier: "warn", label: "Manager-heavy" });
    expect(balanceHealth(55)).toEqual({ tier: "good", label: "Report-led" });
    expect(balanceHealth(78)).toEqual({ tier: "good", label: "Report-led" });
    expect(balanceHealth(79)).toEqual({ tier: "warn", label: "Hands-off" });
  });
});
