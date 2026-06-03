import React from "react";
import type { StalenessTier } from "../../domain/compute";
import { SIGNAL, ShapeGlyph } from "./signal";

interface StatusDotProps {
  tier: StalenessTier;
  /** Size in pixels — default 10 */
  size?: number;
}

/**
 * A tiny status indicator that communicates tier via BOTH colour AND shape
 * (WCAG 1.4.1 — color is never the only visual means of conveying information).
 *
 * Shapes:
 *   fresh   → circle   (filled disc)
 *   warming → ring     (hollow circle — border only)
 *   stale   → diamond  (45-degree rotated square)
 *   cold    → square
 *
 * An sr-only span announces the tier label to screen readers.
 * Shape rendering is delegated to ShapeGlyph (shared with CoverageStrip).
 */
export function StatusDot({ tier, size = 10 }: StatusDotProps) {
  const sig = SIGNAL[tier];

  return (
    <span className="inline-flex items-center gap-1">
      <ShapeGlyph tier={tier} size={size} />
      <span className="sr-only">{sig.label}</span>
    </span>
  );
}
