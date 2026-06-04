import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionItem, ActionOwner, AppData, AsyncItem, MeetingRecord, Person } from "../domain/types";
import type { AppStore } from "../storage/appStore";

type NewAsync = Pick<AsyncItem, "text" | "area" | "mood">;

interface SaveMeetingInput {
  personId: string;
  date: string;
  durationMin: number;
  reportShare: number;
  areas: MeetingRecord["areas"];
  summary: string;
  newActions: { text: string; owner: ActionOwner }[];
}

/** Map over the people array, replacing the person with the given id. */
function mapPerson(
  data: AppData,
  id: string,
  fn: (p: Person) => Person,
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
   * Find the thread by its (globally unique) ID across all people and flip its `raise` flag.
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

      const mapped: ActionItem[] = input.newActions.map((a, i) => ({
        id: `act-${input.personId}-${input.date}-${i}-${crypto.randomUUID().slice(0, 8)}`,
        text: a.text,
        owner: a.owner,
        status: "open" as const,
        createdAt: input.date,
      }));

      const rec: MeetingRecord = {
        date: input.date,
        durationMin: input.durationMin,
        reportShare: input.reportShare,
        areas: input.areas,
        actions: input.newActions.length,
        summary: input.summary,
      };

      return {
        ...p,
        coverage,
        lastOneOnOne: input.date,
        meetings: [...p.meetings, rec],
        talkTrend: [...p.talkTrend, input.reportShare],
        actions: [...p.actions, ...mapped],
      };
    });
  },
};

export type LoadStatus = "loading" | "ready" | "error";

/**
 * React hook — wraps the pure reducers with async useState + persistence.
 * Consumes the async AppStore interface so the same hook drives both
 * localStorage (local build) and Supabase (supabase build).
 *
 * Note: the hook itself is not unit-tested here because the vitest env is
 * `node` and has no DOM. The pure `reducers` above are the tested surface.
 */
export function useAppState(store: AppStore) {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    store
      .load()
      .then((d) => { if (alive) { setData(d); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [store]);

  const apply = useCallback(
    (next: AppData) => {
      setData(next); // optimistic
      setSaveError(false);
      store.save(next).catch(() => setSaveError(true));
    },
    [store],
  );

  return useMemo(
    () => ({
      data,
      status,
      saveError,
      toggleAction: (id: string, now: string) =>
        data && apply(reducers.toggleAction(data, id, now)),
      toggleRaise: (id: string) =>
        data && apply(reducers.toggleRaise(data, id)),
      addAsyncItem: (pid: string, item: NewAsync, now: string, id: string) =>
        data && apply(reducers.addAsyncItem(data, pid, item, now, id)),
      saveMeeting: (input: SaveMeetingInput) =>
        data && apply(reducers.saveMeeting(data, input)),
    }),
    [data, status, saveError, apply],
  );
}
