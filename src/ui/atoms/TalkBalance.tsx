import React from "react";
import { balanceHealth } from "../../domain/compute";

interface TalkBalanceProps {
  /** Report's share of airtime, 0-100 */
  share: number;
  /** Override the default aria-label (computed from share + verdict) */
  ariaLabel?: string;
  /** Height of the balance bar in pixels — default 6 */
  barHeight?: number;
}

/**
 * Horizontal bar split at `share`% (report) vs the remainder (manager).
 *
 * - Report segment: bg-matcha-deep (warm green)
 * - Manager segment: bg-line-2 (muted grey-tan)
 *
 * Below the bar: "{share}% them · {label}" where the verdict label is coloured
 * by balance tier so the indicator communicates meaning beyond just a number.
 * (Color is supplementary — the word carries meaning for WCAG 1.4.1.)
 *
 * Accessibility: role="img" + aria-label give screen-reader users a textual
 * summary of the bar (WCAG 1.1.1).
 */
export function TalkBalance({
  share,
  ariaLabel,
  barHeight = 6,
}: TalkBalanceProps) {
  const health = balanceHealth(share);
  const label = ariaLabel ?? `${share}% report airtime — ${health.label}`;

  // Map balance tier to a Tailwind text-colour utility.
  // good → matcha-deep (green) | warn → yolk-deep (amber) | bad → bad (rust-red) | none → muted
  const verdictColour: Record<typeof health.tier, string> = {
    good: "text-matcha-deep",
    warn: "text-yolk-deep",
    bad: "text-bad",
    none: "text-muted",
  };

  const reportPct = Math.max(0, Math.min(100, share));
  const managerPct = 100 - reportPct;

  return (
    <div role="img" aria-label={label} className="flex flex-col gap-1">
      {/* Bar */}
      <div
        className="flex rounded-pill overflow-hidden"
        style={{ height: barHeight }}
        aria-hidden="true"
      >
        {reportPct > 0 && (
          <div
            className="bg-matcha-deep"
            style={{ width: `${reportPct}%` }}
          />
        )}
        {managerPct > 0 && (
          <div
            className="bg-line-2"
            style={{ width: `${managerPct}%` }}
          />
        )}
      </div>

      {/* Label row */}
      <p className="font-mono text-xs text-muted" aria-hidden="true">
        <span>{share}% them</span>
        {" · "}
        <span className={verdictColour[health.tier]}>{health.label}</span>
      </p>
    </div>
  );
}
