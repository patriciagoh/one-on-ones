import { describe, it, expect } from "vitest";
import { reducers } from "./useAppState";
import { seedData } from "../storage/seed";
import type { ReportFields } from "../domain/types";

const FIELDS: ReportFields = {
  name: "Maya Chen", pronouns: "she/her", cadenceDays: 14,
  seniority: "Senior", team: "Platform", location: "Toronto",
  timezone: "America/Toronto", onCall: true, joinedDate: "2025-02-04",
};

describe("addPerson", () => {
  it("appends a person with derived id/initials and empty history", () => {
    const data = seedData();
    const before = data.people.length;
    const next = reducers.addPerson(data, FIELDS, "p-test-1");
    const p = next.people.find((x) => x.id === "p-test-1")!;
    expect(next.people.length).toBe(before + 1);
    expect(p.name).toBe("Maya Chen");
    expect(p.initials).toBe("MC");
    expect(p.cadenceDays).toBe(14);
    expect(p.seniority).toBe("Senior");
    expect(p.onCall).toBe(true);
    expect(p.joinedDate).toBe("2025-02-04");
    expect(p.meetings).toEqual([]);
    expect(p.actions).toEqual([]);
    expect(p.lastOneOnOne).toBeNull();
  });
});

describe("reducers", () => {
  // -----------------------------------------------------------------------
  // toggleAction
  // -----------------------------------------------------------------------
  it("toggleAction closes an open action: status becomes 'done' and doneAt is set", () => {
    const data = seedData();
    // Sofia's first action is open; use it as a known-open seed action.
    const person = data.people.find((p) => p.id === "p-sofia");
    expect(person).toBeDefined();
    const openAction = person!.actions.find((a) => a.status === "open");
    expect(openAction).toBeDefined();
    const id = openAction!.id;

    const next = reducers.toggleAction(data, id, "2026-06-04");
    const a = next.people.flatMap((p) => p.actions).find((a) => a.id === id);
    expect(a).toBeDefined();

    expect(a!.status).toBe("done");
    expect(a!.doneAt).toBe("2026-06-04");
  });

  it("toggleAction reopens a done action: status becomes 'open' and doneAt is cleared", () => {
    const data = seedData();
    // First close it, then toggle again to reopen.
    const person = data.people.find((p) => p.id === "p-sofia");
    expect(person).toBeDefined();
    const openAction = person!.actions.find((a) => a.status === "open");
    expect(openAction).toBeDefined();
    const id = openAction!.id;

    const closed = reducers.toggleAction(data, id, "2026-06-04");
    const reopened = reducers.toggleAction(closed, id, "2026-06-05");
    const a = reopened.people.flatMap((p) => p.actions).find((a) => a.id === id);
    expect(a).toBeDefined();

    expect(a!.status).toBe("open");
    expect(a!.doneAt).toBeUndefined();
  });

  it("toggleAction unknown id is a no-op", () => {
    const data = seedData();
    expect(reducers.toggleAction(data, "no-such-id", "2026-06-04")).toEqual(data);
  });

  it("toggleAction does not mutate the original data (immutability)", () => {
    const data = seedData();
    const person = data.people.find((p) => p.id === "p-sofia")!;
    const id = person.actions.find((a) => a.status === "open")!.id;
    const originalStatus = person.actions.find((a) => a.id === id)!.status;

    reducers.toggleAction(data, id, "2026-06-04");

    // Original must be unchanged
    const stillOriginal = data.people
      .flatMap((p) => p.actions)
      .find((a) => a.id === id)!;
    expect(stillOriginal.status).toBe(originalStatus);
    expect(stillOriginal.doneAt).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // addAsyncItem
  // -----------------------------------------------------------------------
  it("addAsyncItem appends to the right person", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const before = data.people[0].asyncAgenda.length;

    const next = reducers.addAsyncItem(
      data,
      pid,
      { text: "hi", area: "growth", mood: "neutral" },
      "2026-06-04",
      "new-id",
    );

    expect(next.people[0].asyncAgenda.length).toBe(before + 1);
    expect(next.people[0].asyncAgenda.at(-1)).toMatchObject({ id: "new-id", text: "hi" });
  });

  it("addAsyncItem does not mutate the original data (immutability)", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const originalLen = data.people[0].asyncAgenda.length;

    reducers.addAsyncItem(data, pid, { text: "hi", area: "growth", mood: "neutral" }, "2026-06-04", "new-id");

    expect(data.people[0].asyncAgenda.length).toBe(originalLen);
  });

  // -----------------------------------------------------------------------
  // toggleRaise
  // -----------------------------------------------------------------------
  it("toggleRaise flips a thread's raise flag", () => {
    const data = seedData();
    const allThreads = data.people.flatMap((p) => p.threads);
    expect(allThreads[0]).toBeDefined();
    const t = allThreads[0];
    const original = t.raise;

    const next = reducers.toggleRaise(data, t.id);
    const flipped = next.people.flatMap((p) => p.threads).find((x) => x.id === t.id);
    expect(flipped).toBeDefined();

    expect(flipped!.raise).toBe(!original);
  });

  it("toggleRaise does not mutate the original data (immutability)", () => {
    const data = seedData();
    const allThreads = data.people.flatMap((p) => p.threads);
    expect(allThreads[0]).toBeDefined();
    const t = allThreads[0];
    const original = t.raise;

    reducers.toggleRaise(data, t.id);

    const stillOriginal = data.people.flatMap((p) => p.threads).find((x) => x.id === t.id);
    expect(stillOriginal).toBeDefined();
    expect(stillOriginal!.raise).toBe(original);
  });

  it("toggleRaise unknown id is a no-op", () => {
    const data = seedData();
    expect(reducers.toggleRaise(data, "no-such-id")).toEqual(data);
  });

  // -----------------------------------------------------------------------
  // saveMeeting
  // -----------------------------------------------------------------------
  it("saveMeeting writes a MeetingRecord, bumps coverage to 0 for touched areas, and sets lastOneOnOne", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const beforeCount = data.people[0].meetings.length;

    const next = reducers.saveMeeting(data, {
      personId: pid,
      date: "2026-06-04",
      durationMin: 30,
      reportShare: 60,
      areas: ["growth"],
      summary: "good talk",
      newActions: [{ text: "send promo doc", owner: "manager" }],
    });

    const p = next.people.find((x) => x.id === pid)!;
    expect(p.meetings.length).toBe(beforeCount + 1);
    expect(p.meetings.at(-1)).toMatchObject({ reportShare: 60, date: "2026-06-04" });
    expect(p.coverage.growth).toBe(0);
    expect(p.lastOneOnOne).toBe("2026-06-04");

    // newActions appended as open ActionItems
    const added = p.actions.find((a) => a.text === "send promo doc");
    expect(added).toBeDefined();
    expect(added!.owner).toBe("manager");
    expect(added!.status).toBe("open");

    // MeetingRecord.actions counts commitments captured THIS meeting
    expect(p.meetings.at(-1)!.actions).toBe(1);
  });

  it("saveMeeting appends reportShare to talkTrend", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const beforeLen = data.people[0].talkTrend.length;

    const next = reducers.saveMeeting(data, {
      personId: pid,
      date: "2026-06-04",
      durationMin: 30,
      reportShare: 71,
      areas: ["feedback", "growth"],
      summary: "good talk",
      newActions: [],
    });

    const p = next.people.find((x) => x.id === pid)!;
    expect(p.talkTrend.length).toBe(beforeLen + 1);
    expect(p.talkTrend.at(-1)).toBe(71);
  });

  it("saveMeeting does not mutate the original data (immutability)", () => {
    const data = seedData();
    const pid = data.people[0].id;
    const originalMeetingCount = data.people[0].meetings.length;
    const originalCoverageGrowth = data.people[0].coverage.growth;
    const originalActionsLength = data.people[0].actions.length;

    reducers.saveMeeting(data, {
      personId: pid,
      date: "2026-06-04",
      durationMin: 30,
      reportShare: 60,
      areas: ["growth"],
      summary: "good talk",
      newActions: [{ text: "send promo doc", owner: "manager" }],
    });

    expect(data.people[0].meetings.length).toBe(originalMeetingCount);
    expect(data.people[0].coverage.growth).toBe(originalCoverageGrowth);
    expect(data.people[0].actions.length).toBe(originalActionsLength);
  });

  it("saveMeeting generates unique action IDs across same-day meetings", () => {
    const data = seedData();
    const personId = "p-sofia";
    const input = {
      personId, date: "2026-06-10", durationMin: 30, reportShare: 50,
      areas: ["growth" as const], summary: "s",
      newActions: [{ text: "one", owner: "manager" as const }],
    };
    const once = reducers.saveMeeting(data, input);
    const twice = reducers.saveMeeting(once, input);
    const person = twice.people.find((p) => p.id === personId)!;
    const ids = person.actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("updatePerson", () => {
  it("patches profile fields, recomputes initials, keeps hue + history", () => {
    const base = reducers.addPerson(seedData(), FIELDS, "p-u");
    const original = base.people.find((p) => p.id === "p-u")!;
    const edited = reducers.updatePerson(base, "p-u", { ...FIELDS, name: "Dana Ng", team: "Infra" });
    const p = edited.people.find((x) => x.id === "p-u")!;
    expect(p.name).toBe("Dana Ng");
    expect(p.initials).toBe("DN");
    expect(p.team).toBe("Infra");
    expect(p.hue).toBe(original.hue);
    expect(p.meetings).toBe(original.meetings);
  });
  it("is a no-op for an unknown id", () => {
    const data = seedData();
    expect(reducers.updatePerson(data, "nope", FIELDS)).toEqual(data);
  });
});

describe("removePerson", () => {
  it("removes the target and leaves the rest", () => {
    const data = seedData();
    const id = data.people[0].id;
    const next = reducers.removePerson(data, id);
    expect(next.people.find((p) => p.id === id)).toBeUndefined();
    expect(next.people.length).toBe(data.people.length - 1);
  });
});
