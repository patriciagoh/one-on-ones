import type { AreaKey } from "../../domain/types";
import { AREA_KEYS, AREA_LABELS } from "../../domain/types";
import { stalenessTier } from "../../domain/compute";
import { SIGNAL, ShapeGlyph } from "./signal";

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
 * Per-segment child divs intentionally omit aria-label — the role="img" wrapper
 * flattens its subtree for AT, so per-child labels would be unreachable anyway.
 * The title attribute is kept for mouse tooltips.
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
          >
            {/* Coloured bar */}
            <div
              style={{ height: segmentHeight, backgroundColor: sig.cssVar }}
              className="w-full rounded-sm"
            />
            {/* Shape glyph — color-not-alone (WCAG 1.4.1). Size 6 matches prior visual. */}
            <ShapeGlyph tier={tier} size={6} />
          </div>
        );
      })}
    </div>
  );
}
