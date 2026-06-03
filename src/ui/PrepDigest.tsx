import React from "react";
import type { Person } from "../domain/types";
import { AREA_LABELS } from "../domain/types";
import type { PrepDigest as PrepDigestData } from "../domain/compute";

interface PrepDigestProps {
  digest: PrepDigestData;
  person: Person;
  /** Called when the user activates "Start 1:1". Screens wire this to navigation. */
  onStart?: () => void;
}

/**
 * Dark hero panel shown at the top of the Person screen.
 * Surfaces the top lead (what to address first), stat tiles, and a Start 1:1 CTA.
 *
 * Dark panel uses bg-term-bg / text-term-text — warm dark, not black.
 * Colors are always paired with a word (WCAG 1.4.1).
 */
export function PrepDigest({ digest, person, onStart }: PrepDigestProps) {
  const { lead, raise, openMine, openTheirs, async: asyncItems } = digest;

  // Format a short "today-ish" date string: e.g. "Jun 4"
  const today = new Date();
  const eyebrow = `MEET · ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <section
      aria-label={`Prep digest for ${person.name}`}
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--term-bg)", color: "var(--term-text)" }}
    >
      {/* Eyebrow */}
      <div className="px-5 pt-4 pb-0">
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--term-text)", opacity: 0.55 }}>
          {eyebrow}
        </p>
      </div>

      {/* Lead headline */}
      <div className="px-5 pt-2 pb-4">
        <LeadHeadline lead={lead} personName={person.name} />
      </div>

      {/* 3-up stat row */}
      <div
        className="grid grid-cols-3 gap-px"
        style={{ borderTop: "1px solid var(--term-line, rgba(255,255,255,0.1))" }}
      >
        {/* Start with… */}
        <div className="px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-text)", opacity: 0.5 }}>
            Start with
          </p>
          {raise.length > 0 ? (
            <ul className="space-y-0.5" aria-label="Top threads to raise">
              {raise.map((t) => (
                <li key={t.id} className="text-xs truncate" style={{ color: "var(--term-text)" }}>
                  {t.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: "var(--term-text)", opacity: 0.6 }}>
              No threads flagged
            </p>
          )}
        </div>

        {/* Open loops count */}
        <div className="px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-text)", opacity: 0.5 }}>
            Open loops
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
              {openMine.length}
            </span>
            <span className="text-xs" style={{ color: "var(--term-text)", opacity: 0.6 }}>
              mine
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
              {openTheirs.length}
            </span>
            <span className="text-xs" style={{ color: "var(--term-text)", opacity: 0.6 }}>
              theirs
            </span>
          </div>
        </div>

        {/* Async count */}
        <div className="px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-text)", opacity: 0.5 }}>
            From them
          </p>
          <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
            {asyncItems.length}
          </span>
          <span className="text-xs ml-2" style={{ color: "var(--term-text)", opacity: 0.6 }}>
            {asyncItems.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Start 1:1 CTA */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--term-line, rgba(255,255,255,0.1))" }}
      >
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-sans font-semibold text-sm bg-matcha-deep text-paper transition-colors"
          aria-label={`Start 1:1 with ${person.name}`}
        >
          Start 1:1
        </button>
      </div>
    </section>
  );
}

/** Renders the lead headline based on its kind. */
function LeadHeadline({ lead, personName }: { lead: PrepDigestData["lead"]; personName: string }) {
  if (lead.kind === "async") {
    return (
      <div>
        <blockquote
          className="font-serif italic text-base leading-snug mb-2"
          style={{ color: "var(--term-text)" }}
        >
          &ldquo;{lead.item.text}&rdquo;
        </blockquote>
        <span
          className="inline-block font-mono text-xs uppercase tracking-wide px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "var(--term-text)",
          }}
        >
          {personName} raised this
        </span>
      </div>
    );
  }

  if (lead.kind === "cold-area") {
    return (
      <p className="font-sans font-bold text-xl leading-tight" style={{ color: "var(--term-text)" }}>
        You haven&apos;t touched{" "}
        <span style={{ color: "var(--ooo-stale)" }}>{AREA_LABELS[lead.area]}</span>
        {" "}in{" "}
        <span style={{ color: "var(--ooo-cold)" }}>{lead.days} days.</span>
      </p>
    );
  }

  if (lead.kind === "thread") {
    return (
      <div>
        <p className="font-sans font-bold text-xl leading-tight mb-1" style={{ color: "var(--term-text)" }}>
          {lead.thread.title}
        </p>
        <p className="text-xs" style={{ color: "var(--term-text)", opacity: 0.65 }}>
          {lead.thread.raise ? "Flagged to raise" : "Top priority thread"}
        </p>
      </div>
    );
  }

  // relationship
  return (
    <p className="font-sans font-bold text-xl leading-tight" style={{ color: "var(--term-text)" }}>
      Protect the relationship &mdash; no fires, keep it human.
    </p>
  );
}
