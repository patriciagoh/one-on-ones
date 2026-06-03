// MeetingMode screen — Task 4.7
// @vitest-environment happy-dom is set in the test file, not here.
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppData, AreaKey } from "../domain/types";
import { balanceHealth, raiseQueue } from "../domain/compute";
import { AreaTag } from "./atoms/AreaTag";
import { Avatar } from "./atoms/Avatar";
import { Masthead } from "./Masthead";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgendaStep {
  area: AreaKey;
  /** "async" | "thread" | "template" */
  kind: "async" | "thread" | "template";
  /** Label shown as the secondary tag, e.g. "{name} raised this" */
  sourceLabel?: string;
  /** The prompt / quote text */
  text: string;
  notes: string;
}

interface ActionEntry {
  id: string;
  text: string;
  owner: "report" | "manager";
}

interface SaveMeetingInput {
  personId: string;
  date: string;
  durationMin: number;
  reportShare: number;
  areas: AreaKey[];
  summary: string;
  newActions: { text: string; owner: "report" | "manager" }[];
}

interface MeetingModeProps {
  data: AppData;
  personId: string;
  /** ISO date string used as "today"; never uses new Date() for the saved date */
  now: string;
  templateId?: string;
  onSave: (input: SaveMeetingInput) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as m:ss */
function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Compute report share (0 if no time has elapsed at all) */
function computeShare(reportSec: number, managerSec: number): number {
  const total = reportSec + managerSec;
  if (total === 0) return 0;
  return Math.round((reportSec / total) * 100);
}

// ---------------------------------------------------------------------------
// MeetingMode
// ---------------------------------------------------------------------------

export function MeetingMode({
  data,
  personId,
  now,
  templateId,
  onSave,
}: MeetingModeProps) {
  const navigate = useNavigate();

  // ── Person lookup ──────────────────────────────────────────────────────────
  const person = data.people.find((p) => p.id === personId);

  // ── Not-found guard ────────────────────────────────────────────────────────
  if (!person) {
    return (
      <div className="max-w-screen-md mx-auto px-6 py-12">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <h1
          autoFocus
          tabIndex={-1}
          className="font-sans font-bold text-2xl text-ink mb-4 focus-visible:outline-none"
        >
          Person not found.
        </h1>
        <Link
          to="/"
          className="text-matcha-deep underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
        >
          ← Back to reports
        </Link>
      </div>
    );
  }

  return (
    <MeetingModeInner
      person={person}
      data={data}
      now={now}
      templateId={templateId}
      onSave={onSave}
      navigate={navigate}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner component — only rendered when person exists.
// Separated so hooks are always called (no conditional hooks).
// ---------------------------------------------------------------------------

function MeetingModeInner({
  person,
  data,
  now,
  templateId,
  onSave,
  navigate,
}: {
  person: NonNullable<ReturnType<AppData["people"]["find"]>>;
  data: AppData;
  now: string;
  templateId?: string;
  onSave: (input: SaveMeetingInput) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // ── Build agenda (once, on mount — memo via lazy init) ─────────────────────
  const [agenda] = useState<AgendaStep[]>(() => {
    const steps: AgendaStep[] = [];

    // 1. Async items (report-raised) come first
    for (const item of person.asyncAgenda) {
      steps.push({
        area: item.area,
        kind: "async",
        sourceLabel: `${person.name} raised this`,
        text: item.text,
        notes: "",
      });
    }

    // 2. raiseQueue threads
    const threads = raiseQueue(person, now);
    for (const thread of threads) {
      steps.push({
        area: thread.area,
        kind: "thread",
        sourceLabel: "From threads",
        text: thread.title,
        notes: "",
      });
    }

    // 3. Template prompts (if a matching template is given)
    if (templateId) {
      const tpl = data.templates.find((t) => t.id === templateId);
      if (tpl) {
        for (const prompt of tpl.prompts) {
          steps.push({
            area: tpl.primaryArea,
            kind: "template",
            sourceLabel: tpl.name,
            text: prompt,
            notes: "",
          });
        }
      }
    }

    // Ensure at least one step so the UI doesn't break on empty data
    if (steps.length === 0) {
      steps.push({
        area: "wellbeing",
        kind: "template",
        sourceLabel: "Light check-in",
        text: "How are you, really?",
        notes: "",
      });
    }

    return steps;
  });

  // ── Agenda navigation state ─────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [stepNotes, setStepNotes] = useState<string[]>(() =>
    agenda.map(() => ""),
  );

  const updateNote = useCallback(
    (idx: number, text: string) => {
      setStepNotes((prev) => {
        const next = [...prev];
        next[idx] = text;
        return next;
      });
    },
    [],
  );

  // ── Talk timer state ─────────────────────────────────────────────────────────
  const [reportSeconds, setReportSeconds] = useState(0);
  const [managerSeconds, setManagerSeconds] = useState(0);
  const [holder, setHolder] = useState<"report" | "manager" | null>(null);
  const [running, setRunning] = useState(false);

  // setInterval ref — stored so we can clear it on unmount
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref kept in sync with holder so the interval callback reads the latest
  // value without being stale from closure capture.
  const holderRef = useRef(holder);
  useEffect(() => {
    holderRef.current = holder;
  }, [holder]);

  // Start the interval once any tap target is activated (holder is set)
  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (running && holder !== null) {
      intervalRef.current = setInterval(() => {
        if (holderRef.current === "report") {
          setReportSeconds((s) => s + 1);
        } else {
          setManagerSeconds((s) => s + 1);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, holder]);

  const handleTapReport = useCallback(() => {
    setHolder("report");
    setRunning(true);
  }, []);

  const handleTapManager = useCallback(() => {
    setHolder("manager");
    setRunning(true);
  }, []);

  const handlePauseToggle = useCallback(() => {
    setRunning((r) => !r);
  }, []);

  // ── Derived talk balance ─────────────────────────────────────────────────────
  const reportShare = computeShare(reportSeconds, managerSeconds);
  const balance = balanceHealth(reportShare);
  const elapsedTotal = reportSeconds + managerSeconds;

  // ── Live-region: announce only on verdict change ─────────────────────────────
  // We track the last announced verdict label in a ref and only update the
  // live-region text when the label actually changes (not every second tick).
  const lastAnnouncedVerdictRef = useRef<string>("");
  const [liveText, setLiveText] = useState("");

  useEffect(() => {
    if (balance.label !== lastAnnouncedVerdictRef.current) {
      lastAnnouncedVerdictRef.current = balance.label;
      // Only announce if timer has started (avoids spurious "No data" on entry)
      if (elapsedTotal > 0) {
        setLiveText(balance.label);
      }
    }
  }, [balance.label, elapsedTotal]);

  // ── Action items ─────────────────────────────────────────────────────────────
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [actionDraft, setActionDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState<"report" | "manager">("report");

  const handleAddAction = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = actionDraft.trim();
      if (!text) return;
      setActions((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, text, owner: ownerDraft },
      ]);
      setActionDraft("");
    },
    [actionDraft, ownerDraft],
  );

  // ── Focus heading on entry ────────────────────────────────────────────────────
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // ── End & save ────────────────────────────────────────────────────────────────
  const handleEndSave = useCallback(() => {
    // Stop the timer
    setRunning(false);

    const durationMin = Math.round(elapsedTotal / 60);
    const finalShare = computeShare(reportSeconds, managerSeconds);

    // Collect areas: agenda steps that have non-empty notes; fall back to all
    // agenda step areas if none are annotated.
    const annotatedAreas = Array.from(
      new Set(
        agenda
          .map((s, i) => (stepNotes[i]?.trim() ? s.area : null))
          .filter((a): a is AreaKey => a !== null),
      ),
    );
    const areas: AreaKey[] =
      annotatedAreas.length > 0
        ? annotatedAreas
        : Array.from(new Set(agenda.map((s) => s.area)));

    // Summary: concatenate non-empty step notes, or a brief default.
    const noteParts = stepNotes.filter((n) => n.trim());
    const summary =
      noteParts.length > 0
        ? noteParts.join(" | ")
        : `1:1 with ${person.name} — ${durationMin}m`;

    onSave({
      personId: person.id,
      date: now,
      durationMin,
      reportShare: finalShare,
      areas,
      summary,
      newActions: actions.map((a) => ({ text: a.text, owner: a.owner })),
    });

    // Navigate to summary after save
    navigate(`/person/${person.id}/summary`);
  }, [
    elapsedTotal,
    reportSeconds,
    managerSeconds,
    agenda,
    stepNotes,
    actions,
    person.id,
    person.name,
    now,
    onSave,
    navigate,
  ]);

  // ── Balance tier → colour helper (no raw hex) ─────────────────────────────
  const balanceTierColor: Record<typeof balance.tier, string> = {
    good: "var(--ooo-fresh)",
    warn: "var(--ooo-stale)",
    bad: "var(--ooo-cold)",
    none: "var(--muted)",
  };
  const shareColor = balanceTierColor[balance.tier];

  const currentStep = agenda[step];
  const totalSteps = agenda.length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-oat text-ink">
      {/* ── Masthead ── */}
      <Masthead
        rightSlot={
          <span className="flex items-center gap-3 font-mono text-xs text-muted">
            <Link
              to={`/person/${person.id}`}
              className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm"
            >
              ← {person.name}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{data.people.length} reports</span>
          </span>
        }
      />

      <main id="main" tabIndex={-1} className="focus-visible:outline-none">
        {/* ── Meeting header card ── */}
        <div className="bg-paper border-b border-line px-6 py-4">
          <div className="max-w-screen-xl mx-auto flex items-center gap-4">
            {/* Avatar + title */}
            <Avatar initials={person.initials} hue={person.hue} size={44} />
            <div className="flex-1 min-w-0">
              <h1
                ref={headingRef}
                tabIndex={-1}
                aria-label={`1:1 with ${person.name}`}
                className="font-sans font-bold text-xl text-ink leading-tight focus-visible:outline-none"
              >
                1:1 with {person.name}
              </h1>
              <p className="font-mono text-xs text-muted mt-0.5">
                Live agenda · from threads
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`/person/${person.id}`}
                className="px-4 py-2 rounded-md border border-line-2 text-sm text-ink font-sans font-medium hover:border-matcha-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 36 }}
              >
                Discard
              </Link>
              <button
                type="button"
                onClick={handleEndSave}
                className="px-4 py-2 rounded-md bg-matcha-deep text-paper text-sm font-sans font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 36 }}
              >
                End &amp; save
              </button>
            </div>
          </div>
        </div>

        {/* ── Three-column body ── */}
        <div className="max-w-screen-xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr_280px] gap-6">
          {/* ── LEFT: Live conversation balance ── */}
          <section aria-labelledby="balance-heading" className="bg-paper border border-line rounded-lg p-5">
            <h2
              id="balance-heading"
              className="font-mono text-xs text-muted uppercase tracking-wide mb-4"
            >
              Live conversation balance
            </h2>

            {/* Big percentage */}
            <p
              className="font-mono text-6xl font-bold leading-none mb-1"
              style={{ color: shareColor }}
              aria-label={`${reportShare}% report airtime`}
            >
              {reportShare}%
            </p>

            {/* Verdict label */}
            <p className="text-sm text-muted mb-4">
              <span style={{ color: shareColor }} className="font-medium">
                {reportShare}% them
              </span>{" "}
              · {balance.label}
            </p>

            {/* Tap targets — report and manager */}
            <div className="flex flex-col gap-2 mb-4">
              {/* Report tap target */}
              <button
                type="button"
                onClick={handleTapReport}
                aria-pressed={holder === "report" && running}
                aria-label={`${person.name} speaking — tap to record their talk time. Current: ${fmtTime(reportSeconds)}`}
                className={[
                  "flex items-center justify-between w-full px-4 py-3 rounded-md border transition-colors text-sm font-sans",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2",
                  holder === "report" && running
                    ? "border-matcha-deep bg-matcha-tint"
                    : "border-line bg-paper hover:border-matcha-deep",
                ].join(" ")}
                style={{ minHeight: 44 }}
              >
                <span className="flex items-center gap-2">
                  {/* Status indicator dot */}
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        holder === "report" && running
                          ? "var(--matcha-deep)"
                          : "var(--line-2)",
                    }}
                  />
                  <span className="font-medium text-ink">{person.name}</span>
                  <span className="text-muted">them</span>
                </span>
                <span className="font-mono text-sm text-ink">
                  {fmtTime(reportSeconds)}
                </span>
              </button>

              {/* Manager tap target */}
              <button
                type="button"
                onClick={handleTapManager}
                aria-pressed={holder === "manager" && running}
                aria-label={`You (manager) speaking — tap to record your talk time. Current: ${fmtTime(managerSeconds)}`}
                className={[
                  "flex items-center justify-between w-full px-4 py-3 rounded-md border transition-colors text-sm font-sans",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2",
                  holder === "manager" && running
                    ? "border-matcha-deep bg-matcha-tint"
                    : "border-line bg-paper hover:border-matcha-deep",
                ].join(" ")}
                style={{ minHeight: 44 }}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        holder === "manager" && running
                          ? "var(--matcha-deep)"
                          : "var(--line-2)",
                    }}
                  />
                  <span className="font-medium text-ink">You</span>
                  <span className="text-muted">manager</span>
                </span>
                <span className="font-mono text-sm text-ink">
                  {fmtTime(managerSeconds)}
                </span>
              </button>
            </div>

            {/* Balance bar */}
            <div
              role="img"
              aria-label={`Conversation balance bar: ${reportShare}% ${person.name}, ${100 - reportShare}% you`}
              className="h-2 rounded-full overflow-hidden bg-line mb-3"
            >
              <div
                aria-hidden="true"
                className="h-full rounded-full bg-matcha-deep transition-all"
                style={{ width: `${reportShare}%` }}
              />
            </div>

            {/* Pause + elapsed */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePauseToggle}
                disabled={holder === null}
                aria-label={running ? "Pause timer" : "Resume timer"}
                className="px-4 py-1.5 rounded-md border border-line-2 text-sm text-ink font-sans font-medium hover:border-matcha-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 32 }}
              >
                {running ? "Pause" : "Resume"}
              </button>
              <span className="font-mono text-xs text-muted">
                elapsed {fmtTime(elapsedTotal)}
              </span>
            </div>

            {/* Live region — verdict nudge — announces only on verdict change */}
            {/* Polite so it doesn't interrupt other screen reader announcements */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {liveText}
            </div>

            {/* Visible nudge when manager is driving */}
            {reportShare > 0 && reportShare < 40 && (
              <p
                className="mt-3 text-xs font-mono px-2 py-1.5 rounded-sm"
                style={{
                  color: "var(--ooo-cold)",
                  backgroundColor: "var(--bad-bg)",
                }}
                aria-hidden="true"
              >
                You&apos;re driving — invite them to share
              </p>
            )}
          </section>

          {/* ── CENTER: Agenda ── */}
          <section aria-labelledby="agenda-heading" className="bg-paper border border-line rounded-lg p-5 flex flex-col">
            <h2
              id="agenda-heading"
              className="font-mono text-xs text-muted uppercase tracking-wide mb-3"
            >
              Agenda · {step + 1} of {totalSteps}
            </h2>

            {/* Progress segments */}
            <div
              role="img"
              aria-label={`Agenda progress: step ${step + 1} of ${totalSteps}`}
              className="flex gap-1.5 mb-5"
            >
              {agenda.map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="flex-1 h-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      i <= step ? "var(--matcha-deep)" : "var(--line)",
                  }}
                />
              ))}
            </div>

            {/* Current step */}
            <div className="flex-1">
              {/* Area tag + source label */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <AreaTag area={currentStep.area} variant="tint" />
                {currentStep.sourceLabel && (
                  <span className="font-mono text-xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-neutral-bg text-neutral">
                    {currentStep.sourceLabel}
                  </span>
                )}
              </div>

              {/* The prompt / quote */}
              <blockquote className="font-serif italic text-lg text-ink leading-snug mb-5">
                &ldquo;{currentStep.text}&rdquo;
              </blockquote>

              {/* Notes textarea */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`notes-step-${step}`}
                  className="font-mono text-xs text-muted uppercase tracking-wide"
                >
                  Notes
                </label>
                <textarea
                  id={`notes-step-${step}`}
                  value={stepNotes[step] ?? ""}
                  onChange={(e) => updateNote(step, e.target.value)}
                  placeholder="Capture what was said…"
                  rows={5}
                  className="w-full rounded-md border border-line bg-oat px-3 py-2 text-sm text-ink placeholder:text-muted resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
                />
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                aria-label="Previous agenda topic"
                className="px-4 py-2 rounded-md border border-line-2 text-sm text-ink font-sans font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-matcha-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 36 }}
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                disabled={step === totalSteps - 1}
                aria-label="Next agenda topic"
                className="px-4 py-2 rounded-md bg-matcha-deep text-paper text-sm font-sans font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 36 }}
              >
                Next topic →
              </button>
            </div>
          </section>

          {/* ── RIGHT: Action items ── */}
          <section aria-labelledby="actions-heading" className="bg-paper border border-line rounded-lg p-5">
            <h2
              id="actions-heading"
              className="font-mono text-xs text-muted uppercase tracking-wide mb-1"
            >
              Action items
            </h2>
            <p className="text-xs text-muted mb-4">
              Commitments captured here carry into next week&apos;s agenda.
            </p>

            {/* Add action form */}
            <form onSubmit={handleAddAction} className="flex flex-col gap-2 mb-4">
              <label
                htmlFor="action-draft"
                className="sr-only"
              >
                Add an action item
              </label>
              <textarea
                id="action-draft"
                value={actionDraft}
                onChange={(e) => setActionDraft(e.target.value)}
                placeholder="Add an action item…"
                rows={3}
                className="w-full rounded-md border border-line bg-oat px-3 py-2 text-sm text-ink placeholder:text-muted resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
              />
              {/* Owner toggle */}
              <fieldset className="flex items-center gap-2">
                <legend className="font-mono text-xs text-muted uppercase tracking-wide shrink-0">
                  Owner
                </legend>
                <button
                  type="button"
                  aria-pressed={ownerDraft === "report"}
                  onClick={() => setOwnerDraft("report")}
                  className={[
                    "px-3 py-1 rounded-md border text-xs font-sans font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2",
                    ownerDraft === "report"
                      ? "border-matcha-deep bg-matcha-tint text-ink"
                      : "border-line bg-paper text-muted hover:border-matcha-deep",
                  ].join(" ")}
                  style={{ minHeight: 28 }}
                >
                  Theirs
                </button>
                <button
                  type="button"
                  aria-pressed={ownerDraft === "manager"}
                  onClick={() => setOwnerDraft("manager")}
                  className={[
                    "px-3 py-1 rounded-md border text-xs font-sans font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2",
                    ownerDraft === "manager"
                      ? "border-matcha-deep bg-matcha-tint text-ink"
                      : "border-line bg-paper text-muted hover:border-matcha-deep",
                  ].join(" ")}
                  style={{ minHeight: 28 }}
                >
                  Mine
                </button>
              </fieldset>
              <button
                type="submit"
                className="w-full py-2 rounded-md border border-line-2 text-sm text-ink font-sans font-medium hover:border-matcha-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
                style={{ minHeight: 36 }}
              >
                + Add action
              </button>
            </form>

            {/* Action list */}
            {actions.length > 0 && (
              <ul role="list" className="flex flex-col gap-2">
                {actions.map((action) => (
                  <li
                    key={action.id}
                    className="flex items-start gap-2 py-2 px-3 rounded-md bg-oat border border-line text-sm"
                  >
                    <span className="font-mono text-xs text-muted pt-0.5 shrink-0 uppercase">
                      {action.owner === "report" ? person.name.split(" ")[0] : "You"}
                    </span>
                    <span className="text-ink leading-snug flex-1">{action.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
