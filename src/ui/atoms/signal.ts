import React from "react";
import type { StalenessTier } from "../../domain/compute";

/** Maps a staleness tier to its CSS var, word, and shape glyph.
 *  Color is never load-bearing alone (WCAG 1.4.1) — always render label + shape. */
export const SIGNAL: Record<StalenessTier, { cssVar: string; label: string; shape: string }> = {
  fresh:   { cssVar: "var(--ooo-fresh)",   label: "Fresh",   shape: "circle" },
  warming: { cssVar: "var(--ooo-warming)", label: "Warming", shape: "ring" },
  stale:   { cssVar: "var(--ooo-stale)",   label: "Stale",   shape: "diamond" },
  cold:    { cssVar: "var(--ooo-cold)",    label: "Cold",    shape: "square" },
};

/**
 * Presentational helper — renders the tier shape filled with its signal CSS var.
 * Carries no label; callers add sr-only text as needed (e.g. StatusDot).
 */
export function ShapeGlyph({ tier, size = 10 }: { tier: StalenessTier; size?: number }) {
  const sig = SIGNAL[tier];
  const base: React.CSSProperties = { width: size, height: size };

  if (sig.shape === "circle") {
    return React.createElement("span", {
      className: "inline-block rounded-pill shrink-0",
      style: { ...base, backgroundColor: sig.cssVar },
    });
  }
  if (sig.shape === "ring") {
    // Scale border proportionally; clamp to a minimum of 1px for tiny sizes.
    const borderPx = Math.max(1, Math.round(size * 0.2));
    return React.createElement("span", {
      className: "inline-block rounded-pill shrink-0",
      style: { ...base, border: `${borderPx}px solid ${sig.cssVar}`, backgroundColor: "transparent" },
    });
  }
  if (sig.shape === "diamond") {
    const inner = Math.round(size * 0.707);
    return React.createElement(
      "span",
      { className: "inline-flex items-center justify-center shrink-0", style: base },
      React.createElement("span", {
        className: "inline-block",
        style: { width: inner, height: inner, backgroundColor: sig.cssVar, transform: "rotate(45deg)" },
      }),
    );
  }
  // square
  return React.createElement("span", {
    className: "inline-block rounded-sm shrink-0",
    style: { ...base, backgroundColor: sig.cssVar },
  });
}
