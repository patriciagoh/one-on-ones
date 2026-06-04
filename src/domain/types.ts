export type AreaKey =
  | "growth" | "feedback" | "workload" | "wellbeing" | "relationships" | "recognition";

export const AREA_KEYS: AreaKey[] = [
  "growth", "feedback", "workload", "wellbeing", "relationships", "recognition",
];

export const AREA_LABELS: Record<AreaKey, string> = {
  growth: "Career & growth",
  feedback: "Feedback",
  workload: "Workload & focus",
  wellbeing: "Wellbeing",
  relationships: "Team & relationships",
  recognition: "Recognition",
};

export type ISO = string; // ISO date, e.g. "2026-06-03"

export type ThreadStatus = "open" | "parked";
export interface Thread {
  id: string; title: string; area: AreaKey;
  status: ThreadStatus; priority: number; // 0-100
  lastTouched: ISO; note: string; raise: boolean;
}

export type ActionOwner = "manager" | "report";
export type ActionStatus = "open" | "done";
export interface ActionItem {
  id: string; text: string; owner: ActionOwner;
  status: ActionStatus; createdAt: ISO; doneAt?: ISO;
  fromArea?: AreaKey; linkedThread?: string;
}

export type Mood = "energized" | "neutral" | "unsure" | "stressed";
export interface AsyncItem {
  id: string; text: string; area: AreaKey; mood: Mood; addedAt: ISO;
}

export interface MeetingRecord {
  date: ISO; durationMin: number; reportShare: number; // %
  areas: AreaKey[]; actions: number; summary: string;
}

/** In-memory model nests per-person collections (storage persists the whole
 *  person). This keeps per-person pure functions — prepDigest(person),
 *  attentionScore(person) — from having to read a global store. */
export interface Person {
  id: string; name: string; role: string; pronouns: string; initials: string;
  hue: number; tenureMonths: number;
  cadenceDays: number;
  seniority?: string;
  team?: string;
  location?: string;
  timezone?: string;
  onCall?: boolean;
  joinedDate?: ISO | null;
  lastOneOnOne: ISO | null;
  nextScheduled: ISO | null;
  talkTrend: number[];      // report's % airtime per past meeting (0 = no meeting)
  sentimentTrend: number[]; // 1-5
  coverage: Record<AreaKey, number>; // days since each area was discussed
  threads: Thread[];
  actions: ActionItem[];
  asyncAgenda: AsyncItem[];
  meetings: MeetingRecord[];
}

/** The editable profile fields captured by the add/edit ReportForm. */
export interface ReportFields {
  name: string;
  pronouns: string;
  cadenceDays: number;
  seniority: string;
  team: string;
  location: string;
  timezone: string;
  onCall: boolean;
  joinedDate: ISO | null;
}

export interface TemplateDef {
  id: string; name: string; primaryArea: AreaKey; prompts: string[];
}

export interface AppData {
  version: number;
  people: Person[];
  templates: TemplateDef[];
}
