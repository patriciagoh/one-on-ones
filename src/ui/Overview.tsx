import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { AppData, Person } from "../domain/types";
import { AREA_LABELS } from "../domain/types";
import {
  actionAgeTier,
  attentionOrder,
  bluntestSpot,
  cadenceStatus,
  openActions,
  raiseQueue,
  stalenessTier,
  teamBlindSpots,
  balanceHealth,
  type BlindSpot,
} from "../domain/compute";
import { daysSince } from "../domain/time";
import { Avatar } from "./atoms/Avatar";
import { StatusDot } from "./atoms/StatusDot";
import { CoverageStrip } from "./atoms/CoverageStrip";
import { TalkBalance } from "./atoms/TalkBalance";
import { SIGNAL } from "./atoms/signal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = "attention" | "overdue" | "name";

// ---------------------------------------------------------------------------
// Constants (module scope — not reallocated per render)
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "attention", label: "Needs attention" },
  { key: "overdue", label: "Overdue" },
  { key: "name", label: "Name" },
];

interface OverviewProps {
  data: AppData;
  now: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CADENCE_STATUS_LABEL: Record<ReturnType<typeof cadenceStatus>, string> = {
  ontrack: "On track",
  due: "Due soon",
  stale: "Stale",
  cold: "Cold",
};

/** Readable cadence status tier mapped to a StalenessTier for StatusDot. */
function cadenceToStalenessTier(
  status: ReturnType<typeof cadenceStatus>,
): "fresh" | "warming" | "stale" | "cold" {
  switch (status) {
    case "ontrack": return "fresh";
    case "due": return "warming";
    case "stale": return "stale";
    case "cold": return "cold";
  }
}

function sortPeople(people: Person[], sort: SortKey, now: string): Person[] {
  if (sort === "attention") return attentionOrder(people, now);
  if (sort === "name") return [...people].sort((a, b) => a.name.localeCompare(b.name));
  // "overdue" — sort by days-since-last-1:1 minus cadence desc (most overdue first)
  return [...people].sort((a, b) => {
    const overdueA = a.lastOneOnOne
      ? Math.max(0, daysSince(a.lastOneOnOne, now) - a.cadenceDays)
      : 999;
    const overdueB = b.lastOneOnOne
      ? Math.max(0, daysSince(b.lastOneOnOne, now) - b.cadenceDays)
      : 999;
    return overdueB - overdueA;
  });
}

// ---------------------------------------------------------------------------
// Signal tile (4-up stat row)
// ---------------------------------------------------------------------------

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 py-4 px-5 bg-paper border border-line rounded-md">
      <p className="font-mono text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="font-mono text-3xl font-bold text-ink leading-none">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coverage radar strip (team blind spots)
// ---------------------------------------------------------------------------

function CoverageRadarStrip({ blindSpots }: { blindSpots: BlindSpot[] }) {
  const maxDays = Math.max(...blindSpots.map((b) => b.avgDays), 1);

  return (
    <section aria-label="Coverage radar — what the team isn't talking about">
      <h2 className="font-mono text-xs text-muted uppercase tracking-wide mb-3">
        Coverage radar — what the team isn&apos;t talking about
      </h2>
      <ul className="flex flex-col gap-2" role="list">
        {blindSpots.map((spot) => {
          const tier = stalenessTier(spot.avgDays);
          const sig = SIGNAL[tier];
          const pct = maxDays > 0 ? (spot.avgDays / maxDays) * 100 : 0;
          return (
            <li key={spot.area} className="flex items-center gap-3">
              {/* Area label */}
              <span className="font-mono text-xs text-ink-2 w-36 shrink-0">
                {AREA_LABELS[spot.area]}
              </span>
              {/* Bar */}
              <div
                className="flex-1 relative h-2 bg-oat rounded-pill overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-pill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: sig.cssVar,
                  }}
                />
              </div>
              {/* Days + StatusDot + tier word */}
              <div className="flex items-center gap-1.5 w-28 shrink-0">
                <span className="font-mono text-xs text-ink-2">
                  {Math.round(spot.avgDays)}d avg
                </span>
                <StatusDot tier={tier} size={8} />
                <span
                  className="font-mono text-xs"
                  style={{ color: sig.cssVar }}
                >
                  {sig.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Report card
// ---------------------------------------------------------------------------

function ReportCard({ person, now }: { person: Person; now: string }) {
  const status = cadenceStatus(person, now);
  const statusTier = cadenceToStalenessTier(status);
  const statusLabel = CADENCE_STATUS_LABEL[status];

  const bluntest = bluntestSpot(person);
  const bluntestDays = person.coverage[bluntest];
  const bluntestTier = stalenessTier(bluntestDays);

  // Prefer an open raised thread; fall back to top of raise queue
  const topRaise =
    raiseQueue(person, now).find((t) => t.raise && t.status === "open") ??
    raiseQueue(person, now).find((t) => t.raise);

  // Dedupe openActions — compute once, derive counts from it (item 5)
  const open = openActions(person.actions);
  const openCount = open.length;
  const overdueCount = open.filter(
    (a) => actionAgeTier(daysSince(a.createdAt, now)) === "cold",
  ).length;

  const asyncCount = person.asyncAgenda.length;

  // Last non-zero talk trend for TalkBalance — use findLast (item 8)
  const lastShare = person.talkTrend.findLast((n) => n > 0) ?? 0;

  return (
    <Link
      to={`/person/${person.id}`}
      className="block bg-paper border border-line rounded-lg p-4 hover:border-matcha-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep focus-visible:ring-offset-2"
    >
      {/* Header row: avatar + name/role + status */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar initials={person.initials} hue={person.hue} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-sans font-semibold text-sm text-ink leading-snug truncate">
            {person.name}
          </p>
          <p className="font-mono text-xs text-muted truncate">{person.role}</p>
        </div>
        {/* Cadence status: color + dot + word (WCAG 1.4.1) */}
        <div className="flex items-center gap-1 shrink-0">
          <StatusDot tier={statusTier} size={8} />
          <span className="font-mono text-xs" style={{ color: SIGNAL[statusTier].cssVar }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Coverage strip */}
      <div className="mb-3">
        <CoverageStrip coverage={person.coverage} segmentHeight={6} />
      </div>

      {/* Coldest area sentence */}
      <p className="text-xs text-muted mb-2 truncate">
        <span
          className="font-mono"
          style={{ color: SIGNAL[bluntestTier].cssVar }}
          aria-label={`Coldest area: ${AREA_LABELS[bluntest]}, ${bluntestDays} days`}
        >
          {AREA_LABELS[bluntest]}
        </span>
        {" "}not touched in {bluntestDays}d
      </p>

      {/* Top raise-next thread */}
      {topRaise && (
        <p className="text-xs text-ink-2 mb-3 truncate">
          <span className="text-muted font-mono">Raise: </span>
          {topRaise.title}
        </p>
      )}

      {/* Talk balance */}
      {lastShare > 0 && (
        <div className="mb-3">
          <TalkBalance share={lastShare} barHeight={4} />
        </div>
      )}

      {/* Pills row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* From them */}
        {asyncCount > 0 && (
          <span className="inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded-sm bg-matcha-tint text-matcha-deep">
            {asyncCount} from them
          </span>
        )}

        {/* Open loops */}
        {openCount > 0 && (
          <span
            className="inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: overdueCount > 0 ? "var(--bad-bg)" : "var(--neutral-bg)",
              color: overdueCount > 0 ? "var(--ooo-cold)" : "var(--neutral)",
            }}
          >
            {openCount} open loops{overdueCount > 0 && (
              <span style={{ color: "var(--ooo-cold)" }}> · {overdueCount} overdue</span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Overview screen
// ---------------------------------------------------------------------------

export function Overview({ data, now }: OverviewProps) {
  const [sort, setSort] = useState<SortKey>("attention");

  const { people } = data;
  const sorted = sortPeople(people, sort, now);

  // --- Signal row computations ---

  // Reports overdue: cadenceStatus is stale or cold
  const overdueCount = people.filter((p) => {
    const s = cadenceStatus(p, now);
    return s === "stale" || s === "cold";
  }).length;

  // Threads flagged to raise — open only (parked threads excluded)
  const raiseCount = people.flatMap((p) => p.threads).filter((t) => t.raise && t.status === "open").length;

  // Top team blind spot — computed once, passed to radar strip (item 6)
  const blindSpots = teamBlindSpots(people);
  const topBlindSpot = blindSpots[0];
  const topBlindLabel = topBlindSpot
    ? `${AREA_LABELS[topBlindSpot.area]} · ${Math.round(topBlindSpot.avgDays)}d`
    : "—";

  // Average report airtime (mean of last non-zero talkTrend per person) — use findLast (item 8)
  const shares = people
    .map((p) => p.talkTrend.findLast((n) => n > 0) ?? 0)
    .filter((n) => n > 0);
  const avgShare = shares.length > 0 ? Math.round(shares.reduce((s, n) => s + n, 0) / shares.length) : 0;
  const avgBalance = balanceHealth(avgShare);

  return (
    <div className="min-h-screen bg-oat">
      {/* Masthead */}
      <header
        className="sticky top-0 z-10 bg-oat border-b border-line"
        style={{ borderBottomColor: "var(--line)" }}
      >
        <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
          {/* Wordmark + subtitle */}
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
          {/* Right side nav */}
          <nav aria-label="Site navigation">
            <span className="font-mono text-xs text-muted">
              {people.length} reports
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main id="main" tabIndex={-1} className="max-w-content mx-auto px-6 py-8">
        {/* Headline */}
        <div className="mb-8">
          <h1 className="text-4xl leading-tight mb-1">
            <span className="font-sans font-bold text-ink">
              {people.length === 1 ? "One person." : `${people.length} people.`}
            </span>
            {" "}
            <span className="font-serif italic text-ink">
              What needs you this week.
            </span>
          </h1>
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-2 mb-6" role="group" aria-label="Sort reports by">
          <span className="font-mono text-xs text-muted uppercase tracking-wide mr-1">
            Sort
          </span>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={[
                "px-3 py-1.5 rounded-md font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep",
                sort === key
                  ? "bg-matcha-deep text-paper"
                  : "bg-paper border border-line text-ink hover:border-matcha-deep",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Signal row — 4 stat tiles */}
        <section aria-label="Team signals at a glance" className="mb-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Reports overdue"
              value={overdueCount}
              sub={overdueCount === 1 ? "1 needs a 1:1" : overdueCount > 0 ? `${overdueCount} need a 1:1` : "All on track"}
            />
            <StatTile
              label="Threads to raise"
              value={raiseCount}
              sub={raiseCount === 1 ? "1 thread flagged" : raiseCount > 0 ? `${raiseCount} flagged` : "Nothing flagged"}
            />
            <StatTile
              label="Top blind spot"
              value={
                <span className="text-xl font-mono font-bold text-ink">
                  {AREA_LABELS[topBlindSpot?.area ?? "recognition"]}
                </span>
              }
              sub={topBlindLabel}
            />
            <StatTile
              label="Avg report airtime"
              value={avgShare > 0 ? `${avgShare}%` : "—"}
              sub={avgShare > 0 ? avgBalance.label : "No data"}
            />
          </div>
        </section>

        {/* Coverage radar strip */}
        <section className="mb-8 p-5 bg-paper border border-line rounded-lg">
          <CoverageRadarStrip blindSpots={blindSpots} />
        </section>

        {/* Report cards grid */}
        <section aria-label="Your reports">
          <h2 className="font-mono text-xs text-muted uppercase tracking-wide mb-4">
            Reports
          </h2>
          <ul
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Report cards"
          >
            {sorted.map((person) => (
              <li key={person.id}>
                <ReportCard person={person} now={now} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
