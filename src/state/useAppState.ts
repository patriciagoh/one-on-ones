import { useCallback, useState } from "react";
import type { AppData, AsyncItem, MeetingRecord } from "../domain/types";
import { createStore, type Store } from "../storage/store";

type NewAsync = Pick<AsyncItem, "text" | "area" | "mood">;

interface SaveMeetingInput {
  personId: string;
  date: string;
  durationMin: number;
  reportShare: number;
  areas: MeetingRecord["areas"];
  summary: string;
}

/** Map over the people array, replacing the person with the given id. */
function mapPerson(
  data: AppData,
  id: string,
  fn: (p: AppData["people"][number]) => AppData["people"][number],
): AppData {
  return { ...data, people: data.people.map((p) => (p.id === id ? fn(p) : p)) };
}

/**
 * Pure mutation reducers — each takes an AppData and returns a new AppData
 * without mutating the original. Safe to call in tests without a React context.
 *
 * NOTE: startMeeting / recordTurn are TRANSIENT meeting-screen state and live
 * as local React state in MeetingMode (Phase 4). Only the four reducers below
 * are persisted.
 */
export const reducers = {
  /**
   * Flip an action between open and done.
   * - open  → done:  sets `doneAt = now`
   * - done  → open:  clears `doneAt`
   */
  toggleAction(data: AppData, actionId: string, now: string): AppData {
    return {
      ...data,
      people: data.people.map((p) => ({
        ...p,
        actions: p.actions.map((a) => {
          if (a.id !== actionId) return a;
          return a.status === "open"
            ? { ...a, status: "done" as const, doneAt: now }
            : { ...a, status: "open" as const, doneAt: undefined };
        }),
      })),
    };
  },

  /**
   * Flip a thread's `raise` flag across all people.
   */
  toggleRaise(data: AppData, threadId: string): AppData {
    return {
      ...data,
      people: data.people.map((p) => ({
        ...p,
        threads: p.threads.map((t) =>
          t.id === threadId ? { ...t, raise: !t.raise } : t,
        ),
      })),
    };
  },

  /**
   * Append a new AsyncItem to a person's asyncAgenda.
   */
  addAsyncItem(
    data: AppData,
    personId: string,
    item: NewAsync,
    now: string,
    id: string,
  ): AppData {
    return mapPerson(data, personId, (p) => ({
      ...p,
      asyncAgenda: [...p.asyncAgenda, { id, addedAt: now, ...item }],
    }));
  },

  /**
   * Append a MeetingRecord, reset coverage to 0 for every touched area,
   * update lastOneOnOne, and append reportShare to talkTrend.
   * Open actions carry forward — they are not cleared here.
   */
  saveMeeting(data: AppData, input: SaveMeetingInput): AppData {
    return mapPerson(data, input.personId, (p) => {
      const coverage = { ...p.coverage };
      for (const area of input.areas) coverage[area] = 0;

      const rec: MeetingRecord = {
        date: input.date,
        durationMin: input.durationMin,
        reportShare: input.reportShare,
        areas: input.areas,
        actions: p.actions.filter((a) => a.status === "open").length,
        summary: input.summary,
      };

      return {
        ...p,
        coverage,
        lastOneOnOne: input.date,
        meetings: [...p.meetings, rec],
        talkTrend: [...p.talkTrend, input.reportShare],
      };
    });
  },
};

/**
 * React hook — wraps the pure reducers with useState + persistence.
 * Each mutation calls store.save(next) then updates React state.
 *
 * `store` is injectable for testing the hook in a jsdom environment (Phase 4
 * integration tests); it defaults to the real localStorage-backed store.
 *
 * Note: the hook itself is not unit-tested here because the vitest env is
 * `node` and has no DOM. The pure `reducers` above are the tested surface.
 */
export function useAppState(store: Store = createStore()) {
  const [data, setData] = useState<AppData>(() => store.load());

  const apply = useCallback(
    (next: AppData) => {
      store.save(next);
      setData(next);
    },
    [store],
  );

  return {
    data,
    toggleAction: (id: string, now: string) =>
      apply(reducers.toggleAction(data, id, now)),
    toggleRaise: (id: string) =>
      apply(reducers.toggleRaise(data, id)),
    addAsyncItem: (pid: string, item: NewAsync, now: string, id: string) =>
      apply(reducers.addAsyncItem(data, pid, item, now, id)),
    saveMeeting: (input: SaveMeetingInput) =>
      apply(reducers.saveMeeting(data, input)),
  };
}
