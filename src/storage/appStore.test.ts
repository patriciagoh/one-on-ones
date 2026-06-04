import { describe, it, expect } from "vitest";
import { localAppStore } from "./appStore";
import { createStore, type StoragePort } from "./store";
import { supabaseAppStore, type RowStore } from "./supabaseAppStore";
import { emptyData } from "./seed";
import { AREA_KEYS } from "../domain/types";

function memoryPort(initial?: string): StoragePort {
  let v = initial ?? null;
  return { get: () => v, set: (s) => { v = s; }, remove: () => { v = null; } };
}

describe("localAppStore", () => {
  it("load() resolves the seeded data", async () => {
    const store = localAppStore(createStore(memoryPort()));
    const data = await store.load();
    expect(data.people.length).toBe(6);
  });

  it("save() persists across reloads", async () => {
    const port = memoryPort();
    const store = localAppStore(createStore(port));
    const data = await store.load();
    data.people[0].name = "Renamed";
    await store.save(data);
    const reloaded = await localAppStore(createStore(port)).load();
    expect(reloaded.people[0].name).toBe("Renamed");
  });
});

function fakeRowStore(initial?: unknown): RowStore {
  let row: unknown = initial ?? null;
  return {
    read: async () => row,
    write: async (data) => { row = data; },
    remove: async () => { row = null; },
  };
}

describe("supabaseAppStore", () => {
  it("bootstraps an empty account to empty-but-ready", async () => {
    const data = await supabaseAppStore(fakeRowStore()).load();
    expect(data.people).toEqual([]);
    expect(data.templates).toEqual(emptyData().templates);
  });

  it("returns the stored blob when a row exists", async () => {
    const stored = { version: 2, people: [], templates: [] };
    const data = await supabaseAppStore(fakeRowStore(stored)).load();
    expect(data.version).toBe(2);
  });

  it("normalizes loaded data (backfills coverage keys)", async () => {
    const person = { ...seededPerson(), coverage: {} };
    const stored = { version: 2, people: [person], templates: [] };
    const data = await supabaseAppStore(fakeRowStore(stored)).load();
    for (const k of AREA_KEYS) expect(typeof data.people[0].coverage[k]).toBe("number");
  });

  it("save() writes through to the row store", async () => {
    const rs = fakeRowStore();
    const store = supabaseAppStore(rs);
    const data = await store.load();
    data.people = [seededPerson()];
    await store.save(data);
    expect(await store.load()).toMatchObject({ people: [{ id: "p-x" }] });
  });

  it("reset() removes the row", async () => {
    const rs = fakeRowStore({ version: 2, people: [], templates: [] });
    await supabaseAppStore(rs).reset();
    const after = await supabaseAppStore(rs).load();
    expect(after.people).toEqual([]); // re-bootstrapped
  });

  it("throws on an unrecognized non-null row rather than silently overwriting it", async () => {
    const rs = fakeRowStore({ version: 1, garbage: true });
    await expect(supabaseAppStore(rs).load()).rejects.toThrow();
    expect(await rs.read()).toMatchObject({ version: 1 }); // corrupt row preserved, not replaced
  });
});

function seededPerson() {
  return {
    id: "p-x", name: "X", role: "r", pronouns: "they/them", initials: "X",
    hue: 0, tenureMonths: 1, cadenceDays: 7, lastOneOnOne: null, nextScheduled: null,
    talkTrend: [], sentimentTrend: [],
    coverage: { growth: 0, feedback: 0, workload: 0, wellbeing: 0, relationships: 0, recognition: 0 },
    threads: [], actions: [], asyncAgenda: [], meetings: [],
  };
}
