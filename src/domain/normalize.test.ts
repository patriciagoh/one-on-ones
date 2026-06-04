import { describe, it, expect } from "vitest";
import { normalizeAppData } from "./normalize";
import { AREA_KEYS } from "./types";
import { seedData } from "../storage/seed";

describe("normalizeAppData", () => {
  it("backfills missing coverage keys to 0", () => {
    const data = seedData();
    delete (data.people[0].coverage as Record<string, number>)[AREA_KEYS[2]];
    const out = normalizeAppData(data);
    for (const k of AREA_KEYS) {
      expect(typeof out.people[0].coverage[k]).toBe("number");
    }
    expect(out.people[0].coverage[AREA_KEYS[2]]).toBe(0);
  });

  it("clamps cadenceDays below 1 up to 1", () => {
    const data = seedData();
    data.people[0].cadenceDays = 0;
    const out = normalizeAppData(data);
    expect(out.people[0].cadenceDays).toBe(1);
  });

  it("leaves already-valid data unchanged in value", () => {
    const data = seedData();
    const out = normalizeAppData(data);
    expect(out.people.length).toBe(data.people.length);
    expect(out.people[0].cadenceDays).toBe(data.people[0].cadenceDays);
  });

  it("defaults the new profile fields", () => {
    const data = seedData();
    const p = normalizeAppData(data).people[0];
    expect(p.seniority).toBe("");
    expect(p.team).toBe("");
    expect(p.location).toBe("");
    expect(p.timezone).toBe("");
    expect(p.onCall).toBe(false);
    expect(p.joinedDate).toBeNull();
  });
});
