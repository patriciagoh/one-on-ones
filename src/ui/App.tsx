// App shell — Task 4.9
// HashRouter + routes + skip link. One useAppState() at the root; data flows down.
import React from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAppState } from "../state/useAppState";
import { Overview } from "./Overview";
import { Person } from "./Person";
import { MeetingMode } from "./MeetingMode";
import { Summary } from "./Summary";
import type { AreaKey, Mood } from "../domain/types";

// NOTE: A single "now" string is computed once at module load for deterministic
// seed-relative calculations in this prototype. Every screen receives it as a
// prop so domain/compute functions remain pure (no Date.now() inside them).
const NOW = "2026-06-04";

// ---------------------------------------------------------------------------
// Route wrappers — read :id from useParams, wire state mutations
// ---------------------------------------------------------------------------

/** Renders the Person screen for the current :id param. */
function PersonRoute({
  state,
}: {
  state: ReturnType<typeof useAppState>;
}) {
  const { id = "" } = useParams<{ id: string }>();

  return (
    <Person
      data={state.data}
      personId={id}
      now={NOW}
      onToggleRaise={(threadId) => state.toggleRaise(threadId)}
      onToggleAction={(actionId) => state.toggleAction(actionId, NOW)}
      onAddAsync={(item: { text: string; area: AreaKey; mood: Mood }) =>
        // Generate a stable-enough ID: person-scoped + timestamp.
        state.addAsyncItem(id, item, NOW, `async-${id}-${Date.now()}`)
      }
    />
  );
}

/** Renders MeetingMode for the current :id param.
 *  Reads the optional "template" search param and passes it to MeetingMode.
 *  onSave persists synchronously via saveMeeting; MeetingMode then navigates
 *  to /person/:id/summary so Summary immediately reads the fresh meeting. */
function MeetingRoute({
  state,
}: {
  state: ReturnType<typeof useAppState>;
}) {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template") ?? undefined;

  return (
    <MeetingMode
      data={state.data}
      personId={id}
      now={NOW}
      templateId={templateId}
      onSave={(input) => state.saveMeeting(input)}
    />
  );
}

/** Renders the Summary screen for the current :id param. */
function SummaryRoute({
  state,
}: {
  state: ReturnType<typeof useAppState>;
}) {
  const { id = "" } = useParams<{ id: string }>();

  return (
    <Summary data={state.data} personId={id} now={NOW} />
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const state = useAppState();

  return (
    <HashRouter>
      {/* Skip link — visible on focus, targets the #main landmark in each screen. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Routes>
        {/* Overview — list of all reports */}
        <Route
          path="/"
          element={<Overview data={state.data} now={NOW} />}
        />

        {/* Person — deep-dive on one report */}
        <Route
          path="/person/:id"
          element={<PersonRoute state={state} />}
        />

        {/* MeetingMode — live 1:1 session */}
        <Route
          path="/person/:id/meeting"
          element={<MeetingRoute state={state} />}
        />

        {/* Summary — post-meeting recap */}
        <Route
          path="/person/:id/summary"
          element={<SummaryRoute state={state} />}
        />

        {/* Catch-all — redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
