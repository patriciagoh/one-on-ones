import React from "react";
import type { AreaKey } from "../../domain/types";
import { AREA_KEYS, AREA_LABELS } from "../../domain/types";
import { stalenessTier } from "../../domain/compute";
import { SIGNAL } from "./signal";

interface CoverageStripProps {
  coverage: Record<AreaKey, number>;
  /** Height of each segment bar in pixels — default 8 */
  segmentHeight?: number;
}

/**
 * A compact row of 6 coloured segments — one per conversation area — each
 * filled with the SIGNAL colour for its staleness tier.
 *
 * Each segment includes:
 * - A colored bar (dynamic colour via inline style, not a hex literal)
 * - A `<title>` on the SVG fragment for tooltip/tooltip-equivalent text
 * - The tier SHAPE glyph below the bar so colour is never the only signal
 *   (WCAG 1.4.1)
 *
 * Accessibility: the wrapper has role="img" and an aria-label that names the
 * worst area, giving AT users the key takeaway without needing to read all six.
 */
export function CoverageStrip({
  coverage,
  segmentHeight = 8,
}: CoverageStripProps) {
  // Build per-area info
  const areas = AREA_KEYS.map((area) => {
    const days = coverage[area];
    const tier = stalenessTier(days);
    const sig = SIGNAL[tier];
    return { area, days, tier, sig };
  });

  // Worst area for the summary aria-label
  const worst = areas.reduce((a, b) => (a.days >= b.days ? a : b));
  const summaryLabel = `Coverage: worst area is ${AREA_LABELS[worst.area]} (${worst.sig.label}, ${worst.days} days). Areas: ${areas.map((a) => `${AREA_LABELS[a.area]} ${a.sig.label}`).join(", ")}.`;

  return (
    <div
      role="img"
      aria-label={summaryLabel}
      className="flex gap-0.5 items-end"
    >
      {areas.map(({ area, days, tier, sig }) => {
        const segmentLabel = `${AREA_LABELS[area]}: ${sig.label} (${days} days)`;
        return (
          <div
            key={area}
            className="flex flex-col items-center gap-0.5 flex-1"
            title={segmentLabel}
            aria-label={segmentLabel}
          >
            {/* Coloured bar */}
            <div
              style={{ height: segmentHeight, backgroundColor: sig.cssVar }}
              className="w-full rounded-sm"
            />
            {/* Shape glyph — color-not-alone (WCAG 1.4.1) */}
            <ShapeGlyph shape={sig.shape} cssVar={sig.cssVar} size={6} />
          </div>
        );
      })}
    </div>
  );
}

/** Renders the tier shape as a tiny inline element using the signal CSS var. */
function ShapeGlyph({
  shape,
  cssVar,
  size,
}: {
  shape: string;
  cssVar: string;
  size: number;
}) {
  const style: React.CSSProperties = { width: size, height: size };

  if (shape === "circle") {
    return (
      <span
        className="inline-block rounded-pill"
        style={{ ...style, backgroundColor: cssVar }}
      />
    );
  }
  if (shape === "ring") {
    return (
      <span
        className="inline-block rounded-pill"
        style={{ ...style, border: `1.5px solid ${cssVar}`, backgroundColor: "transparent" }}
      />
    );
  }
  if (shape === "diamond") {
    const inner = Math.round(size * 0.75);
    return (
      <span
        className="inline-flex items-center justify-center"
        style={style}
      >
        <span
          className="inline-block"
          style={{
            width: inner,
            height: inner,
            backgroundColor: cssVar,
            transform: "rotate(45deg)",
          }}
        />
      </span>
    );
  }
  // square
  return (
    <span
      className="inline-block rounded-sm"
      style={{ ...style, backgroundColor: cssVar }}
    />
  );
}
