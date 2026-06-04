import { describe, it, expect } from "vitest";
import { createStore, type StoragePort } from "./store";

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
  it("mutating returned data does not corrupt port storage", () => {
    const s = createStore(memoryPort());
    const d1 = s.load();
    d1.people[0].name = "mutated";
    const d2 = s.load();
    expect(d2.people[0].name).not.toBe("mutated");
  });
  it("each load() returns an independent object graph", () => {
    const s = createStore(memoryPort());
    const d1 = s.load();
    const d2 = s.load();
    expect(d1.people[0]).not.toBe(d2.people[0]);
    d1.people[0].name = "mutated";
    expect(d2.people[0].name).not.toBe("mutated");
  });
  it("migrated or reseeded blob is flushed to port storage", () => {
    const v1 = JSON.stringify({ version: 1, people: [], areas: [], threads: [] });
    const port = memoryPort(v1);
    createStore(port).load();
    const stored = JSON.parse(port.get()!);
    expect(stored.version).toBe(2);
  });

  it("backs up an unrecognized blob before reseeding over it", () => {
    let backedUp: string | null = null;
    const original = JSON.stringify({ version: 99, secret: "real notes" });
    const port: StoragePort = {
      get: () => original,
      // flush behavior for this path is covered by the "migrated or reseeded blob is flushed" test
      set: () => {},
      remove: () => {},
      backup: (v) => { backedUp = v; },
    };
    createStore(port).load();
    expect(backedUp).toBe(original);
  });

  it("does not back up when storage is empty (nothing to lose)", () => {
    let backupCalls = 0;
    const port: StoragePort = {
      get: () => null,
      set: () => {},
      remove: () => {},
      backup: () => { backupCalls += 1; },
    };
    createStore(port).load();
    expect(backupCalls).toBe(0);
  });
});
