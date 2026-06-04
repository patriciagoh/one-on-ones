import { useState } from "react";
import type { ReportFields } from "../domain/types";
import { LOCATION_TIMEZONE, tzLabel, CA_PROVINCES, US_STATES } from "./reportFormOptions";

const CADENCES = [
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every 3 weeks", days: 21 },
  { label: "Monthly", days: 30 },
];

const EMPTY: ReportFields = {
  name: "", pronouns: "", cadenceDays: 14, seniority: "", team: "",
  location: "", timezone: "", onCall: false, joinedDate: null,
};

interface ReportFormProps {
  mode: "add" | "edit";
  initial?: ReportFields;
  onSubmit: (fields: ReportFields) => void;
}

export function ReportForm({ mode, initial, onSubmit }: ReportFormProps) {
  const [f, setF] = useState<ReportFields>(initial ?? EMPTY);
  const [error, setError] = useState(false);
  const set = <K extends keyof ReportFields>(k: K, v: ReportFields[K]) => setF((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { setError(true); return; }
    onSubmit({ ...f, name: f.name.trim() });
  }

  const field = "mt-1 mb-4 w-full px-3 py-2 rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg font-sans text-ink">
      <label htmlFor="rf-name" className="block text-sm font-medium">Name</label>
      <input id="rf-name" className={field} value={f.name} onChange={(e) => set("name", e.target.value)} />

      <label htmlFor="rf-cadence" className="block text-sm font-medium">Meeting cadence</label>
      <select id="rf-cadence" className={field} value={f.cadenceDays}
        onChange={(e) => set("cadenceDays", Number(e.target.value))}>
        {CADENCES.map((c) => <option key={c.days} value={c.days}>{c.label}</option>)}
      </select>

      <label htmlFor="rf-seniority" className="block text-sm font-medium">Seniority</label>
      <input id="rf-seniority" className={field} value={f.seniority} onChange={(e) => set("seniority", e.target.value)} />

      <label htmlFor="rf-team" className="block text-sm font-medium">Team</label>
      <input id="rf-team" className={field} value={f.team} onChange={(e) => set("team", e.target.value)} />

      <label htmlFor="rf-location" className="block text-sm font-medium">Location</label>
      <select id="rf-location" className={`${field} mb-0`} value={f.location}
        onChange={(e) => {
          const loc = e.target.value;
          setF((p) => ({ ...p, location: loc, timezone: LOCATION_TIMEZONE[loc] ?? "" }));
        }}>
        <option value="">Select location…</option>
        <optgroup label="Canada">
          {CA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </optgroup>
        <optgroup label="United States">
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </optgroup>
      </select>
      {f.timezone && (
        <p className="mt-1 mb-4 text-sm text-muted">Timezone: {tzLabel(f.timezone)}</p>
      )}

      <label htmlFor="rf-joined" className="block text-sm font-medium">Joined</label>
      <input id="rf-joined" type="date" className={field}
        value={f.joinedDate ?? ""} onChange={(e) => set("joinedDate", e.target.value || null)} />

      <label htmlFor="rf-pronouns" className="block text-sm font-medium">Pronouns</label>
      <input id="rf-pronouns" className={field} value={f.pronouns} onChange={(e) => set("pronouns", e.target.value)} />

      <label className="flex items-center gap-2 mb-4 text-sm font-medium">
        <input type="checkbox" checked={f.onCall} onChange={(e) => set("onCall", e.target.checked)} />
        On-call
      </label>

      {error && <p role="alert" className="text-sm text-bad mb-4">Name is required.</p>}

      <button type="submit"
        className="px-4 py-2 rounded-md bg-matcha-deep text-paper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2">
        {mode === "add" ? "Add report" : "Save changes"}
      </button>
    </form>
  );
}
