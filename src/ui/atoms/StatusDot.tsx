import React from "react";
import type { StalenessTier } from "../../domain/compute";
import { SIGNAL } from "./signal";

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
 */
export function StatusDot({ tier, size = 10 }: StatusDotProps) {
  const sig = SIGNAL[tier];
  const base: React.CSSProperties = { width: size, height: size };

  let shapeEl: React.ReactElement;

  if (sig.shape === "circle") {
    shapeEl = (
      <span
        className="inline-block rounded-pill shrink-0"
        style={{ ...base, backgroundColor: sig.cssVar }}
      />
    );
  } else if (sig.shape === "ring") {
    shapeEl = (
      <span
        className="inline-block rounded-pill shrink-0"
        style={{ ...base, border: `2px solid ${sig.cssVar}`, backgroundColor: "transparent" }}
      />
    );
  } else if (sig.shape === "diamond") {
    // A square rotated 45° — rendered at size/√2 so the diagonal matches `size`.
    const inner = Math.round(size * 0.707);
    shapeEl = (
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <span
          className="inline-block"
          style={{
            width: inner,
            height: inner,
            backgroundColor: sig.cssVar,
            transform: "rotate(45deg)",
          }}
        />
      </span>
    );
  } else {
    // square
    shapeEl = (
      <span
        className="inline-block rounded-sm shrink-0"
        style={{ ...base, backgroundColor: sig.cssVar }}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {shapeEl}
      <span className="sr-only">{sig.label}</span>
    </span>
  );
}
