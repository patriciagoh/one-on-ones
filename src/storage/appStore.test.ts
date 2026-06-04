import { describe, it, expect } from "vitest";
import { localAppStore } from "./appStore";
import { createStore, type StoragePort } from "./store";

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
