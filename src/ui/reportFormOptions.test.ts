import { describe, it, expect } from "vitest";
import { CA_PROVINCES, US_STATES, LOCATION_TIMEZONE, NA_TIMEZONES } from "./reportFormOptions";

describe("LOCATION_TIMEZONE", () => {
  it("maps every province and state to a known timezone", () => {
    const tzValues = new Set(NA_TIMEZONES.map((t) => t.value));
    for (const loc of [...CA_PROVINCES, ...US_STATES]) {
      expect(LOCATION_TIMEZONE[loc], `missing: ${loc}`).toBeDefined();
      expect(tzValues.has(LOCATION_TIMEZONE[loc]), `bad tz for ${loc}`).toBe(true);
    }
  });
});
