import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Masthead } from "./Masthead";
import { ReportForm } from "./ReportForm";
import type { AppData, ReportFields } from "../domain/types";

interface Props {
  data: AppData;
  onUpdate: (id: string, f: ReportFields) => void;
  onRemove: (id: string) => void;
}

export function EditReportScreen({ data, onUpdate, onRemove }: Props) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const person = data.people.find((p) => p.id === id);

  if (!person) {
    return (
      <>
        <Masthead />
        <main id="main" className="max-w-content mx-auto px-6 py-8">
          <h1 className="font-sans font-bold text-2xl text-ink">Person not found.</h1>
        </main>
      </>
    );
  }

  const initial: ReportFields = {
    name: person.name, pronouns: person.pronouns, cadenceDays: person.cadenceDays,
    seniority: person.seniority ?? "", team: person.team ?? "", location: person.location ?? "",
    timezone: person.timezone ?? "", onCall: person.onCall ?? false, joinedDate: person.joinedDate ?? null,
  };

  return (
    <>
      <Masthead />
      <main id="main" className="max-w-content mx-auto px-6 py-8">
        <h1 className="font-sans font-bold text-2xl text-ink mb-6">Edit {person.name}</h1>
        <ReportForm mode="edit" initial={initial} onSubmit={(f) => { onUpdate(id, f); navigate(`/person/${id}`); }} />

        <div className="mt-8 pt-6 border-t border-line">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="font-mono text-sm text-bad focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1">
              Delete report
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink">Delete {person.name} permanently?</span>
              <button type="button" onClick={() => { onRemove(id); navigate("/"); }}
                className="px-3 py-1.5 rounded-md bg-bad text-paper font-sans text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="font-mono text-sm text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1">
                Cancel
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
