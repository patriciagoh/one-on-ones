// Person screen — Task 4.6
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppData, AreaKey, AsyncItem, Mood, Thread, MeetingRecord, TemplateDef } from "../domain/types";
import { AREA_LABELS } from "../domain/types";
import {
  prepDigest,
  raiseQueue,
  stalenessTier,
  balanceHealth,
} from "../domain/compute";
import { Avatar } from "./atoms/Avatar";
import { AreaTag } from "./atoms/AreaTag";
import { CoverageRadar } from "./atoms/CoverageRadar";
import { Sparkline } from "./atoms/Sparkline";
import { TalkBalance } from "./atoms/TalkBalance";
import { SIGNAL } from "./atoms/signal";
import { PrepDigest } from "./PrepDigest";
import { ActionLedger } from "./ActionLedger";
import { AsyncAgenda } from "./AsyncAgenda";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PersonProps {
  data: AppData;
  personId: string;
  now: string;
  onToggleRaise: (threadId: string) => void;
  onToggleAction: (actionId: string) => void;
  onAddAsync: (item: { text: string; area: AreaKey; mood: Mood }) => void;
}

// ---------------------------------------------------------------------------
// RaiseRow — a single thread in the "What to raise next" list
// ---------------------------------------------------------------------------

function RaiseRow({
  thread,
  now,
  onToggleRaise,
}: {
  thread: Thread;
  now: string;
  onToggleRaise: (id: string) => void;
}) {
  const tier = stalenessTier(
    Math.round((Date.parse(now) - Date.parse(thread.lastTouched)) / 86_400_000),
  );
  const sig = SIGNAL[tier];

  // Why caption: raised flag or priority band or staleness
  let why = "";
  if (thread.raise) {
    why = "Flagged to raise";
  } else if (thread.priority >= 70) {
    why = "High priority";
  } else if (tier === "cold" || tier === "stale") {
    why = "Not discussed recently";
  } else {
    why = "In queue";
  }

  return (
    <li className="flex items-start gap-3 py-2.5 px-3 rounded-md bg-paper border border-line">
      {/* Area tag */}
      <div className="shrink-0 mt-0.5">
        <AreaTag area={thread.area} variant="tint" />
      </div>

      {/* Title + why */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-ink leading-snug"
          style={thread.status === "parked" ? { opacity: 0.6 } : undefined}
        >
          {thread.title}
        </p>
        <p className="font-mono text-xs mt-0.5" style={{ color: sig.cssVar }}>
          {why}
        </p>
      </div>

      {/* Raise toggle */}
      <button
        type="button"
        aria-pressed={thread.raise}
        aria-label={`${thread.raise ? "Remove from" : "Add to"} raise queue: ${thread.title}`}
        onClick={() => onToggleRaise(thread.id)}
        className={[
          "shrink-0 px-2.5 py-1 rounded-sm font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep",
          thread.raise
            ? "bg-matcha-deep text-paper"
            : "bg-oat border border-line text-muted hover:border-matcha-deep",
        ].join(" ")}
        style={{ minHeight: 24 }}
      >
        {thread.raise ? "Raise ✓" : "Raise"}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard — a focused 1:1 template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  personId,
}: {
  template: TemplateDef;
  personId: string;
}) {
  return (
    <Link
      to={`/person/${personId}/meeting?template=${template.id}`}
      className="block bg-paper border border-line rounded-lg p-3 hover:border-matcha-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <AreaTag area={template.primaryArea} variant="tint" />
      </div>
      <p className="font-sans font-semibold text-sm text-ink leading-snug mb-1">
        {template.name}
      </p>
      {template.prompts[0] && (
        <p className="font-mono text-xs text-muted truncate">{template.prompts[0]}</p>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// HistoryRow — a single past meeting in the history timeline
// ---------------------------------------------------------------------------

function HistoryRow({ meeting }: { meeting: MeetingRecord }) {
  const dateStr = new Date(meeting.date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const health = balanceHealth(meeting.reportShare);
  const verdictColour: Record<typeof health.tier, string> = {
    good: "var(--ooo-fresh)",
    warn: "var(--ooo-stale)",
    bad: "var(--ooo-cold)",
    none: "var(--muted)",
  };

  return (
    <li className="flex gap-4 py-3 border-b border-line last:border-b-0">
      {/* Date */}
      <div className="shrink-0 w-14 font-mono text-xs text-muted pt-0.5">{dateStr}</div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Areas */}
        <div className="flex items-center gap-1 flex-wrap mb-1">
          {meeting.areas.map((area) => (
            <AreaTag key={area} area={area} variant="tint" />
          ))}
        </div>

        {/* Summary */}
        <p className="text-sm text-ink-2 leading-snug mb-1 truncate">{meeting.summary}</p>

        {/* Report share */}
        <p className="font-mono text-xs" style={{ color: verdictColour[health.tier] }}>
          {meeting.reportShare}% them · {health.label}
        </p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// AreaDetail — shown below the radar when an area is selected
// ---------------------------------------------------------------------------

function AreaDetail({
  area,
  coverage,
  threads,
}: {
  area: AreaKey;
  coverage: Record<AreaKey, number>;
  threads: Thread[];
}) {
  const days = coverage[area];
  const tier = stalenessTier(days);
  const sig = SIGNAL[tier];
  const areaThreads = threads.filter((t) => t.area === area && t.status === "open");

  return (
    <div
      className="mt-3 p-3 rounded-md border border-line bg-paper text-sm"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs font-bold" style={{ color: sig.cssVar }}>
          {AREA_LABELS[area]}
        </span>
        <span className="font-mono text-xs text-muted">
          {days === 0 ? "Discussed today" : `${days}d ago`} · {sig.label}
        </span>
      </div>
      {areaThreads.length > 0 ? (
        <ul className="space-y-1" role="list">
          {areaThreads.map((t) => (
            <li key={t.id} className="font-mono text-xs text-ink-2 truncate">
              {t.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-xs text-muted">No open threads in this area.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Person screen
// ---------------------------------------------------------------------------

export function Person({
  data,
  personId,
  now,
  onToggleRaise,
  onToggleAction,
  onAddAsync,
}: PersonProps) {
  const navigate = useNavigate();
  const [selectedArea, setSelectedArea] = useState<AreaKey | null>(null);

  // Find person or show "not found"
  const person = data.people.find((p) => p.id === personId);

  if (!person) {
    return (
      <div className="min-h-screen bg-oat flex flex-col">
        <main id="main" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <p className="font-sans text-lg text-ink mb-4">Person not found.</p>
          <Link
            to="/"
            className="font-mono text-sm text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
          >
            ← reports
          </Link>
        </main>
      </div>
    );
  }

  const digest = prepDigest(person, now);
  const queue = raiseQueue(person, now);

  // Last non-zero talkTrend entry for sparkline caption
  const lastShare = person.talkTrend.findLast((n) => n > 0) ?? 0;
  const sparklineAriaLabel =
    person.talkTrend.length > 0
      ? `Talk trend: ${person.talkTrend.join(", ")} over last ${person.talkTrend.length} meetings`
      : "Talk trend: no data";

  // Meetings newest-first
  const meetingsDesc = [...person.meetings].reverse();

  function handleStart() {
    navigate(`/person/${personId}/meeting`);
  }

  return (
    <div className="min-h-screen bg-oat">
      {/* Masthead */}
      <header
        className="sticky top-0 z-10 bg-oat border-b border-line"
        style={{ borderBottomColor: "var(--line)" }}
      >
        <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href="#/"
              className="font-mono font-bold text-sm text-ink tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm"
              aria-label="one-on-ones — home"
            >
              one-on-<span className="text-matcha-deep">ones</span>
            </a>
            <span className="font-mono text-xs text-muted hidden sm:inline" aria-hidden="true">
              · meaningful 1:1s
            </span>
          </div>
          <nav aria-label="Site navigation">
            <Link
              to="/"
              className="font-mono text-xs text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
            >
              ← all reports
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main id="main" tabIndex={-1} className="max-w-content mx-auto px-6 py-8">
        {/* Back link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 font-mono text-xs text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm"
          >
            ← reports
          </Link>
        </div>

        {/* Person header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar initials={person.initials} hue={person.hue} size={56} />

          <div className="flex-1 min-w-0">
            {/* h1 = person name (single h1 on this screen) */}
            <h1 className="font-sans font-bold text-2xl text-ink leading-tight mb-0.5">
              {person.name}
            </h1>
            <p className="font-mono text-xs text-muted">
              {person.role}
              {person.pronouns ? <span> · {person.pronouns}</span> : null}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {/* "in team" chip */}
              <span className="inline-flex items-center font-mono text-xs px-2 py-0.5 rounded-sm bg-matcha-tint text-matcha-deep">
                in team
              </span>
              {/* Tenure chip */}
              <span className="inline-flex items-center font-mono text-xs px-2 py-0.5 rounded-sm bg-oat border border-line text-muted">
                {person.tenureMonths}mo tenure
              </span>
            </div>
          </div>

          {/* Primary CTA — "Start 1:1" */}
          <Link
            to={`/person/${personId}/meeting`}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md font-sans font-semibold text-sm bg-matcha-deep text-paper transition-colors hover:bg-matcha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
            aria-label={`Start 1:1 with ${person.name}`}
            style={{ minHeight: 40 }}
          >
            Start 1:1
          </Link>
        </div>

        {/* PrepDigest hero */}
        <div className="mb-8">
          <PrepDigest
            digest={digest}
            person={person}
            now={now}
            onStart={handleStart}
          />
        </div>

        {/* Two-column layout: left rail + right column */}
        <div className="flex gap-8 items-start flex-col lg:flex-row">
          {/* ── Left rail ─────────────────────────────────────────────────── */}
          <aside
            className="lg:w-56 shrink-0 flex flex-col gap-6"
            aria-label="Coverage and conversation balance"
          >
            {/* Coverage radar */}
            <section aria-label="Coverage radar">
              <h2 className="font-mono text-xs text-muted uppercase tracking-wide mb-3">
                Coverage
              </h2>
              <div className="flex justify-center">
                <CoverageRadar
                  coverage={person.coverage}
                  onSelectArea={(area) =>
                    setSelectedArea((prev) => (prev === area ? null : area))
                  }
                  selectedArea={selectedArea}
                  size={160}
                />
              </div>

              {/* Selected area detail */}
              {selectedArea && (
                <AreaDetail
                  area={selectedArea}
                  coverage={person.coverage}
                  threads={person.threads}
                />
              )}
            </section>

            {/* Conversation balance */}
            <section aria-label="Conversation balance">
              <h2 className="font-mono text-xs text-muted uppercase tracking-wide mb-3">
                Conversation balance
              </h2>
              <div className="flex items-end gap-3">
                <Sparkline
                  values={person.talkTrend}
                  ariaLabel={sparklineAriaLabel}
                  width={72}
                  height={28}
                />
                <span className="font-mono text-xs text-muted leading-none">
                  {person.talkTrend.length}m trend
                </span>
              </div>
              {lastShare > 0 && (
                <div className="mt-2">
                  <TalkBalance share={lastShare} barHeight={6} />
                </div>
              )}
            </section>
          </aside>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            {/* Async agenda: "From [name]" */}
            <section className="bg-paper border border-line rounded-lg p-4">
              <AsyncAgenda
                person={person}
                items={person.asyncAgenda}
                onAdd={onAddAsync}
              />
            </section>

            {/* What to raise next */}
            <section aria-label="What to raise next">
              <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wide mb-3">
                What to raise next
              </h2>
              {queue.length === 0 ? (
                <p className="text-sm text-muted py-2">No threads in queue.</p>
              ) : (
                <ul className="flex flex-col gap-2" role="list">
                  {queue.map((thread) => (
                    <RaiseRow
                      key={thread.id}
                      thread={thread}
                      now={now}
                      onToggleRaise={onToggleRaise}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Action ledger */}
            <section className="bg-paper border border-line rounded-lg p-4">
              <ActionLedger
                actions={person.actions}
                onToggle={onToggleAction}
                now={now}
              />
            </section>

            {/* Templates: "Start a focused 1:1" */}
            <section aria-label="Start a focused 1:1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wide">
                  Start a focused 1:1
                </h2>
                <span className="font-mono text-xs text-muted">
                  {data.templates.length} templates
                </span>
              </div>
              <ul
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3"
                role="list"
              >
                {data.templates.map((template) => (
                  <li key={template.id}>
                    <TemplateCard template={template} personId={personId} />
                  </li>
                ))}
              </ul>
            </section>

            {/* History timeline */}
            {meetingsDesc.length > 0 && (
              <section aria-label="Meeting history">
                <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wide mb-3">
                  History
                </h2>
                <div className="bg-paper border border-line rounded-lg px-4">
                  <ul role="list">
                    {meetingsDesc.map((meeting) => (
                      <HistoryRow key={meeting.date} meeting={meeting} />
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
