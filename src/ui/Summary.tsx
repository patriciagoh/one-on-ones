// Summary screen — Task 4.8
// Shows a post-meeting summary card for the most recent meeting with a person.
import React from "react";
import { Link } from "react-router-dom";
import type { AppData } from "../domain/types";
import { balanceHealth } from "../domain/compute";
import { AreaTag } from "./atoms/AreaTag";
import { Masthead } from "./Masthead";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryProps {
  data: AppData;
  personId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as m:ss — e.g. 65 → "1:05", 4 → "0:04" */
function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format an ISO date as "JUN 3" style (upper-case month + day). */
function fmtDate(iso: string): string {
  // Parse as noon local time to avoid day-off-by-one from UTC midnight.
  const d = new Date(iso + "T12:00:00");
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Tile components
// ---------------------------------------------------------------------------

function TileCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 p-5 rounded-lg border border-line bg-oat flex flex-col gap-1">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary screen
// ---------------------------------------------------------------------------

export function Summary({ data, personId }: SummaryProps) {
  const person = data.people.find((p) => p.id === personId);

  // ── Not-found guard ──────────────────────────────────────────────────────
  if (!person) {
    return (
      <div className="min-h-screen bg-oat">
        <Masthead />
        <main id="main" tabIndex={-1} className="max-w-content mx-auto px-6 py-16 flex flex-col items-center">
          <p className="font-sans text-lg text-ink mb-4">Person not found.</p>
          <Link
            to="/"
            className="font-mono text-sm text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
          >
            ← Back to reports
          </Link>
        </main>
      </div>
    );
  }

  const meeting = person.meetings.at(-1);

  // ── No-meetings guard ────────────────────────────────────────────────────
  if (!meeting) {
    return (
      <div className="min-h-screen bg-oat">
        <Masthead />
        <main id="main" tabIndex={-1} className="max-w-content mx-auto px-6 py-16 flex flex-col items-center">
          <p className="font-sans text-lg text-ink mb-2">No meetings yet with {person.name}.</p>
          <p className="font-mono text-sm text-muted mb-6">Start a 1:1 to see a summary here.</p>
          <Link
            to={`/person/${personId}`}
            className="font-mono text-sm text-matcha-deep hover:text-matcha transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep rounded-sm px-1"
          >
            ← Back to {person.name}
          </Link>
        </main>
      </div>
    );
  }

  // ── Airtime tile computations ────────────────────────────────────────────
  const balance = balanceHealth(meeting.reportShare);

  // Color for the percentage — mapped from balance tier (color-not-alone: label is also shown).
  const balanceTierColor: Record<typeof balance.tier, string> = {
    good: "var(--ooo-fresh)",
    warn: "var(--ooo-stale)",
    bad: "var(--ooo-cold)",
    none: "var(--muted)",
  };
  const shareColor = balanceTierColor[balance.tier];

  // ── Time tile computations ───────────────────────────────────────────────
  const totalSeconds = meeting.durationMin * 60;
  const themSeconds = Math.round(totalSeconds * (meeting.reportShare / 100));
  const youSeconds = totalSeconds - themSeconds;

  return (
    <div className="min-h-screen bg-oat">
      <Masthead
        rightSlot={
          <span className="font-mono text-xs text-muted">
            {data.people.length} reports
          </span>
        }
      />

      <main id="main" tabIndex={-1} className="max-w-content mx-auto px-6 py-12 focus-visible:outline-none">
        {/* Centered summary card */}
        <div className="max-w-xl mx-auto bg-paper border border-line rounded-xl p-8 flex flex-col gap-6">
          {/* Eyebrow */}
          <p className="font-mono text-xs text-muted uppercase tracking-widest">
            1:1 SAVED · {fmtDate(meeting.date)}
          </p>

          {/* Heading */}
          <h1 className="font-sans font-bold text-2xl text-ink leading-tight">
            How it went with {person.name}
          </h1>

          {/* Two tiles */}
          <div
            className="flex gap-4 flex-col sm:flex-row"
            role="group"
            aria-label="Meeting stats"
          >
            {/* Tile 1: Report airtime */}
            <TileCard>
              {/* Color + word together satisfies WCAG 1.4.1 */}
              <p
                className="font-mono text-4xl font-bold leading-none"
                style={{ color: shareColor }}
                aria-label={`${meeting.reportShare}% their airtime`}
              >
                {meeting.reportShare}%
              </p>
              <p className="font-mono text-xs text-muted mt-1">
                their airtime ·{" "}
                <span className="font-bold" style={{ color: shareColor }}>
                  {balance.label}
                </span>
              </p>
            </TileCard>

            {/* Tile 2: Total time + split */}
            <TileCard>
              <p
                className="font-mono text-4xl font-bold leading-none text-ink"
                aria-label={`${fmtTime(totalSeconds)} total meeting time`}
              >
                {fmtTime(totalSeconds)}
              </p>
              <p className="font-mono text-xs text-muted mt-1">
                total · {fmtTime(themSeconds)} them / {fmtTime(youSeconds)} you
              </p>
            </TileCard>
          </div>

          {/* Coverage refreshed row */}
          {meeting.areas.length > 0 && (
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
                Coverage refreshed
              </p>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Areas covered in this meeting">
                {meeting.areas.map((area) => (
                  <div key={area} role="listitem">
                    <AreaTag area={area} variant="muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary CTA — Back to person */}
          <Link
            to={`/person/${personId}`}
            className="block w-full text-center py-3 rounded-lg bg-matcha-deep text-paper font-sans font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
            style={{ minHeight: 44 }}
            aria-label={`Back to ${person.name}`}
          >
            Back to {person.name}
          </Link>
        </div>
      </main>
    </div>
  );
}
