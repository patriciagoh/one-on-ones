import React, { useState } from "react";
import type { ActionItem } from "../domain/types";
import { actionAgeTier } from "../domain/compute";
import { daysSince } from "../domain/time";
import { ShapeGlyph } from "./atoms/signal";

interface ActionLedgerProps {
  /** All actions for this person (open + done). The component splits them. */
  actions: ActionItem[];
  /** Called with the action ID when the user toggles an item. */
  onToggle: (id: string) => void;
  /** ISO date string for age calculation. */
  now: string;
}

/** Maps an age tier to a short display label */
const AGE_LABEL: Record<ReturnType<typeof actionAgeTier>, string> = {
  fresh: "Fresh",
  warming: "Warming",
  cold: "Overdue",
};

/**
 * "Open loops" — grouped by owner (mine / theirs).
 * Each open action has a real checkbox button (≥24px tap target).
 * The age tag is always color + word (WCAG 1.4.1):
 *   - cold (overdue): var(--ooo-cold) + the word "Overdue" + square shape
 *   - warming: var(--ooo-warming) + "Warming" + ring shape
 *   - fresh: var(--ooo-fresh) + "Fresh" + circle shape
 * Done items collapse under a disclosure summary.
 */
export function ActionLedger({ actions, onToggle, now }: ActionLedgerProps) {
  const open = actions.filter((a) => a.status === "open");
  const done = actions.filter((a) => a.status === "done");

  const openMine = open.filter((a) => a.owner === "manager");
  const openTheirs = open.filter((a) => a.owner === "report");

  return (
    <section aria-label="Open loops">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wide">
          Open loops
        </h2>
        <div className="flex gap-3 font-mono text-xs text-muted uppercase tracking-wide" aria-hidden="true">
          <span>Mine</span>
          <span>Report</span>
          <span>Close</span>
        </div>
      </div>

      {open.length === 0 && (
        <p className="text-sm text-muted py-2">All clear — no open loops.</p>
      )}

      {/* Mine (manager-owned) */}
      {openMine.length > 0 && (
        <div className="mb-3">
          <p className="font-mono text-xs text-muted uppercase tracking-wide mb-1.5">
            Mine
          </p>
          <ul className="space-y-1" role="list">
            {openMine.map((action) => (
              <ActionRow key={action.id} action={action} onToggle={onToggle} now={now} />
            ))}
          </ul>
        </div>
      )}

      {/* Theirs (report-owned) */}
      {openTheirs.length > 0 && (
        <div className="mb-3">
          <p className="font-mono text-xs text-muted uppercase tracking-wide mb-1.5">
            Theirs
          </p>
          <ul className="space-y-1" role="list">
            {openTheirs.map((action) => (
              <ActionRow key={action.id} action={action} onToggle={onToggle} now={now} />
            ))}
          </ul>
        </div>
      )}

      {/* Done — collapsed disclosure */}
      {done.length > 0 && (
        <DoneDisclosure items={done} />
      )}
    </section>
  );
}

/** A single open action row with a checkbox button and age tag. */
function ActionRow({
  action,
  onToggle,
  now,
}: {
  action: ActionItem;
  onToggle: (id: string) => void;
  now: string;
}) {
  const days = daysSince(action.createdAt, now);
  const tier = actionAgeTier(days);
  const label = AGE_LABEL[tier];

  // Color: use ooo signal vars (always paired with word + shape below)
  const tierCssVar =
    tier === "cold"
      ? "var(--ooo-cold)"
      : tier === "warming"
      ? "var(--ooo-warming)"
      : "var(--ooo-fresh)";

  // For cold we use stalenessTier-compatible shape; map actionAgeTier to stalenessTier shape
  const signalTier =
    tier === "cold" ? ("cold" as const) : tier === "warming" ? ("warming" as const) : ("fresh" as const);

  return (
    <li className="flex items-start gap-2 py-1.5 px-2 rounded-sm bg-paper border border-line">
      {/* Checkbox button — min 24px, role=checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={false}
        aria-label={`Mark done: ${action.text}`}
        onClick={() => onToggle(action.id)}
        className="shrink-0 flex items-center justify-center rounded-sm border border-line-2 bg-oat mt-0.5 transition-colors hover:border-matcha-deep focus-visible:outline-none focus-visible:ring-2"
        style={{ minWidth: 24, minHeight: 24, width: 24, height: 24 }}
      >
        <span className="sr-only">Mark done</span>
      </button>

      {/* Action text */}
      <span className="flex-1 text-sm text-ink leading-snug pt-0.5">{action.text}</span>

      {/* Age tag: color + shape + word (WCAG 1.4.1) */}
      <span
        className="shrink-0 inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded-sm mt-0.5"
        style={{
          color: tierCssVar,
          backgroundColor:
            tier === "cold"
              ? "var(--bad-bg)"
              : tier === "warming"
              ? "var(--yolk-tint)"
              : "var(--matcha-tint)",
        }}
        aria-label={`Age: ${label}`}
      >
        <ShapeGlyph tier={signalTier} size={8} />
        <span>{label}</span>
      </span>
    </li>
  );
}

/** Collapsible disclosure for recently-closed actions. */
function DoneDisclosure({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted font-mono uppercase tracking-wide py-1 hover:text-ink-2 transition-colors"
      >
        <span
          aria-hidden="true"
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        {items.length} closed recently
      </button>

      {open && (
        <ul className="mt-1 space-y-1" role="list">
          {items.map((action) => (
            <li
              key={action.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded-sm bg-neutral-bg opacity-70"
            >
              {/* Done indicator — visual checkmark, not interactive */}
              <span
                aria-hidden="true"
                className="shrink-0 flex items-center justify-center rounded-sm mt-0.5"
                style={{
                  minWidth: 24,
                  minHeight: 24,
                  width: 24,
                  height: 24,
                  backgroundColor: "var(--matcha-tint)",
                  color: "var(--matcha-deep)",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
              <span className="flex-1 text-sm text-muted leading-snug pt-0.5 line-through">
                {action.text}
              </span>
              <span className="sr-only">Closed</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
