import type { StalenessTier } from "../../domain/compute";

/** Maps a staleness tier to its CSS var, word, and shape glyph.
 *  Color is never load-bearing alone (WCAG 1.4.1) — always render label + shape. */
export const SIGNAL: Record<StalenessTier, { cssVar: string; label: string; shape: string }> = {
  fresh:   { cssVar: "var(--ooo-fresh)",   label: "Fresh",   shape: "circle" },
  warming: { cssVar: "var(--ooo-warming)", label: "Warming", shape: "ring" },
  stale:   { cssVar: "var(--ooo-stale)",   label: "Stale",   shape: "diamond" },
  cold:    { cssVar: "var(--ooo-cold)",    label: "Cold",    shape: "square" },
};
