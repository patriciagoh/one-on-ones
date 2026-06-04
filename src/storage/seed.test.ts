import { describe, it, expect } from "vitest";
import { emptyData, seedData } from "./seed";

describe("emptyData", () => {
  it("has no people", () => {
    expect(emptyData().people).toEqual([]);
  });
  it("includes the same templates as the full seed", () => {
    expect(emptyData().templates).toEqual(seedData().templates);
  });
  it("is schema version 2", () => {
    expect(emptyData().version).toBe(2);
  });
  it("returns an independent object each call", () => {
    const a = emptyData();
    a.people.push({} as never);
    expect(emptyData().people.length).toBe(0);
  });
});
