import type { Person } from "../domain/types";
import { AREA_LABELS } from "../domain/types";
import type { PrepDigest as PrepDigestData } from "../domain/compute";

interface PrepDigestProps {
  digest: PrepDigestData;
  person: Person;
  /** ISO date string used for the eyebrow date. Pass new Date().toISOString() from the screen. */
  now: string;
  /** Called when the user activates "Start 1:1". Screens wire this to navigation. */
  onStart?: () => void;
  /** Override aria-label on the Start 1:1 button so it can be differentiated from other
   *  "Start 1:1" controls on the same page. Defaults to "Start 1:1 with {name} from prep digest". */
  startLabel?: string;
}

/**
 * Dark hero panel shown at the top of the Person screen.
 * Surfaces the top lead (what to address first), stat tiles, and a Start 1:1 CTA.
 *
 * Dark panel uses bg-term-bg / text-term-text — warm dark, not black.
 * Colors are always paired with a word (WCAG 1.4.1).
 */
export function PrepDigest({ digest, person, now, onStart, startLabel }: PrepDigestProps) {
  const { lead, raise, openMine, openTheirs, async: asyncItems } = digest;

  // Derive eyebrow date from the now prop (deterministic, no new Date() in render).
  const eyebrow = `MEET · ${new Date(now + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <section
      aria-label={`Prep digest for ${person.name}`}
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--term-bg)", color: "var(--term-text)" }}
    >
      {/* Eyebrow */}
      <div className="px-5 pt-4 pb-0">
        {/* color: var(--term-muted) — 5.82:1 on term-bg, WCAG AA pass for small text */}
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--term-muted)" }}>
          {eyebrow}
        </p>
      </div>

      {/* Lead headline */}
      <div className="px-5 pt-2 pb-4">
        <LeadHeadline lead={lead} personName={person.name} />
      </div>

      {/* 3-up stat row — intentionally non-interactive summary stats (display only).
          The Start 1:1 button below is this panel's only action. */}
      <div
        className="grid grid-cols-3 gap-px"
        style={{ borderTop: "1px solid var(--term-line)" }}
      >
        {/* Start with… */}
        <div className="px-4 py-3">
          {/* color: var(--term-muted) — 5.82:1 on term-bg, WCAG AA pass for small text */}
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-muted)" }}>
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
            <p className="text-xs" style={{ color: "var(--term-muted)" }}>
              No threads flagged
            </p>
          )}
        </div>

        {/* Open loops count */}
        <div className="px-4 py-3">
          {/* color: var(--term-muted) — 5.82:1 on term-bg, WCAG AA pass for small text */}
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-muted)" }}>
            Open loops
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
              {openMine.length}
            </span>
            <span className="text-xs" style={{ color: "var(--term-muted)" }}>
              mine
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
              {openTheirs.length}
            </span>
            <span className="text-xs" style={{ color: "var(--term-muted)" }}>
              theirs
            </span>
          </div>
        </div>

        {/* Async count */}
        <div className="px-4 py-3">
          {/* color: var(--term-muted) — 5.82:1 on term-bg, WCAG AA pass for small text */}
          <p className="font-mono text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--term-muted)" }}>
            From them
          </p>
          <span className="font-mono text-lg font-bold leading-none" style={{ color: "var(--term-text)" }}>
            {asyncItems.length}
          </span>
          <span className="text-xs ml-2" style={{ color: "var(--term-muted)" }}>
            {asyncItems.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Start 1:1 CTA */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--term-line)" }}
      >
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-sans font-semibold text-sm bg-matcha-deep text-paper transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2"
          aria-label={startLabel ?? `Start 1:1 with ${person.name} from prep digest`}
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
        {/* Badge background: color-mix keeps us token-pure; no raw rgba. */}
        <span
          className="inline-block font-mono text-xs uppercase tracking-wide px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--term-text) 12%, transparent)",
            color: "var(--term-text)",
          }}
        >
          {personName} raised this
        </span>
      </div>
    );
  }

  if (lead.kind === "cold-area") {
    // Render entire headline in term-text — the WORDS carry the meaning
    // ("You haven't touched {area} in {N} days"), so WCAG 1.4.1 is satisfied
    // without color tints. ooo-stale/ooo-cold fail on term-bg (~2.95:1 / ~2.29:1)
    // so those inline colors have been removed.
    return (
      <p className="font-sans font-bold text-xl leading-tight" style={{ color: "var(--term-text)" }}>
        You haven&apos;t touched{" "}
        {AREA_LABELS[lead.area]}
        {" "}in{" "}
        {lead.days} days.
      </p>
    );
  }

  if (lead.kind === "thread") {
    return (
      <div>
        <p className="font-sans font-bold text-xl leading-tight mb-1" style={{ color: "var(--term-text)" }}>
          {lead.thread.title}
        </p>
        <p className="text-xs" style={{ color: "var(--term-muted)" }}>
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
