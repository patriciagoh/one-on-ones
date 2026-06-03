import { describe, it, expect } from "vitest";
import { createStore, type StoragePort } from "./store";
import { seedData } from "./seed";

function memoryPort(initial?: string): StoragePort {
  let v = initial ?? null;
  return { get: () => v, set: (s) => { v = s; }, remove: () => { v = null; } };
}

describe("store", () => {
  it("seeds when storage is empty", () => {
    const s = createStore(memoryPort());
    expect(s.load().people.length).toBe(6);
    expect(s.load().version).toBe(2);
  });
  it("round-trips a save", () => {
    const port = memoryPort();
    const s = createStore(port);
    const data = s.load();
    data.people[0].name = "Renamed";
    s.save(data);
    expect(createStore(port).load().people[0].name).toBe("Renamed");
  });
  it("migrates a v1 blob by reseeding (no v1 people shape preserved)", () => {
    const v1 = JSON.stringify({ version: 1, people: [], areas: [], threads: [] });
    const s = createStore(memoryPort(v1));
    expect(s.load().version).toBe(2);
    expect(s.load().people.length).toBe(6);
  });
  it("reset clears storage and next load re-seeds", () => {
    const port = memoryPort();
    const s = createStore(port);
    s.load();
    s.reset();
    expect(createStore(port).load().people.length).toBe(6);
  });
  it("returns structuredClone-safe data (mutation does not affect internal store)", () => {
    const s = createStore(memoryPort());
    const d1 = s.load();
    d1.people[0].name = "mutated";
    const d2 = s.load();
    expect(d2.people[0].name).not.toBe("mutated");
  });
});
