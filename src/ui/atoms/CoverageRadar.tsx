import React from "react";
import type { AreaKey } from "../../domain/types";
import { AREA_KEYS, AREA_LABELS } from "../../domain/types";
import { stalenessTier } from "../../domain/compute";
import { clamp } from "../../domain/time";
import { SIGNAL } from "./signal";

interface CoverageRadarProps {
  coverage: Record<AreaKey, number>;
  /** When provided, renders interactive hotspot buttons on each axis tip. */
  onSelectArea?: (area: AreaKey) => void;
  selectedArea?: AreaKey | null;
  /** SVG size in px — default 160 */
  size?: number;
}

/** Half-padding added around the SVG so axis-tip hotspot buttons stay within
 *  the container box and are never clipped by an overflow-hidden ancestor.
 *  Must be ≥ half the button size (12) — we use 14 to give a 2px cushion. */
const RADAR_PADDING = 14;

/**
 * Six-spoke radar chart where each axis = a conversation area, and the spoke
 * length = how fresh that area is (full = covered recently, short = stale).
 *
 * Accessibility:
 *   - The SVG has role="img" with an aria-label listing each area + tier.
 *   - When onSelectArea is provided, 6 focusable <button> hotspots (≥24px)
 *     are rendered, each labelled with area + tier + days. The selected area
 *     gets a visible ring and aria-pressed="true".
 *   - In interactive mode the container expands by RADAR_PADDING on each side
 *     so buttons at the top/bottom axes are never clipped by overflow-hidden.
 *
 * Color for each spoke comes from SIGNAL[tier].cssVar (a CSS var, not a hex
 * literal), satisfying the token guardrail.
 */

export function CoverageRadar({
  coverage,
  onSelectArea,
  selectedArea,
  size = 160,
}: CoverageRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) * 0.72; // leave margin for labels and hotspots

  // 6 axes evenly spaced, starting from the top (−90°)
  const angles = AREA_KEYS.map((_, i) => (-Math.PI / 2) + (i * 2 * Math.PI) / 6);

  const areas = AREA_KEYS.map((area, i) => {
    const days = coverage[area];
    const tier = stalenessTier(days);
    const sig = SIGNAL[tier];
    // freshness: 1 = just discussed (full spoke), 0 = 45+ days (no spoke)
    const freshness = 1 - clamp(days, 0, 45) / 45;
    const r = freshness * maxR;
    // Tip point on the spoke
    const px = cx + r * Math.cos(angles[i]);
    const py = cy + r * Math.sin(angles[i]);
    // Full-length axis endpoint (for the guide line)
    const ax = cx + maxR * Math.cos(angles[i]);
    const ay = cy + maxR * Math.sin(angles[i]);
    // Hotspot centre in SVG coordinate space (origin = SVG top-left).
    // Buttons are positioned in the padded container space by adding RADAR_PADDING.
    const hotR = maxR + 14;
    const hx = cx + hotR * Math.cos(angles[i]);
    const hy = cy + hotR * Math.sin(angles[i]);
    return { area, days, tier, sig, freshness, r, px, py, ax, ay, hx, hy };
  });

  // Build the filled radar polygon from the tip points
  const polygonPoints = areas.map((a) => `${a.px.toFixed(2)},${a.py.toFixed(2)}`).join(" ");

  // Aria label lists every area and its tier
  const ariaLabel = `Coverage radar: ${areas.map((a) => `${AREA_LABELS[a.area]} ${a.sig.label} (${a.days} days)`).join(", ")}.`;

  // Background hexagon guide lines (ring at 1/3, 2/3, full)
  const hexRings = [0.33, 0.67, 1.0].map((frac) => {
    const pts = AREA_KEYS.map((_, i) => {
      const r = maxR * frac;
      const x = cx + r * Math.cos(angles[i]);
      const y = cy + r * Math.sin(angles[i]);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    return pts;
  });

  // In interactive mode, expand the container by RADAR_PADDING on each side so
  // the 24px hotspot buttons at the axis tips are fully inside the box.
  // In static mode the padding is 0 — no visual change.
  const pad = onSelectArea ? RADAR_PADDING : 0;
  const containerSize = size + pad * 2;

  return (
    <div className="relative inline-block" style={{ width: containerSize, height: containerSize }}>
      <svg
        role="img"
        aria-label={ariaLabel}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden={onSelectArea ? "true" : undefined}
        style={pad ? { margin: pad } : undefined}
      >
        {/* Grid rings */}
        {hexRings.map((pts, ri) => (
          <polygon
            key={ri}
            points={pts}
            fill="none"
            stroke="var(--line)"
            strokeWidth={0.75}
          />
        ))}

        {/* Axis spokes (guide lines) */}
        {areas.map(({ area, ax, ay }) => (
          <line
            key={`axis-${area}`}
            x1={cx}
            y1={cy}
            x2={ax}
            y2={ay}
            stroke="var(--line)"
            strokeWidth={0.75}
          />
        ))}

        {/* Filled coverage polygon */}
        <polygon
          points={polygonPoints}
          style={{ fill: "var(--matcha-tint)", stroke: "var(--matcha-deep)", strokeWidth: 1.5, fillOpacity: 0.7 }}
        />

        {/* Tier-coloured dots at each axis tip */}
        {areas.map(({ area, px, py, sig, freshness }) => (
          freshness > 0 ? (
            <circle
              key={`dot-${area}`}
              cx={px}
              cy={py}
              r={4}
              style={{ fill: sig.cssVar }}
              aria-hidden="true"
            />
          ) : null
        ))}

        {/* Area labels at axis endpoints */}
        {areas.map(({ area, ax, ay, sig }, i) => {
          // Place labels between the outer guide ring and the hotspot buttons
          // so they don't render directly behind the button hit area.
          // maxR * 0.88 sits inside the outer ring (at maxR) with ~6px gap.
          const labelR = maxR * 0.88;
          const lx = cx + labelR * Math.cos(angles[i]);
          const ly = cy + labelR * Math.sin(angles[i]);
          // Horizontal alignment: left side → end, right side → start, top/bottom → middle
          const cos = Math.cos(angles[i]);
          const textAnchor = cos < -0.3 ? "end" : cos > 0.3 ? "start" : "middle";
          // Short label (first word of the area label)
          const shortLabel = AREA_LABELS[area].split(" ")[0];
          return (
            <text
              key={`label-${area}`}
              x={lx.toFixed(2)}
              y={ly.toFixed(2)}
              fontSize={9}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              style={{ fill: "var(--muted)", fontFamily: "var(--mono)" }}
              aria-hidden="true"
            >
              {shortLabel}
            </text>
          );
        })}

        {/* Selected-area ring overlay (rendered in SVG for visual fidelity) */}
        {selectedArea && (() => {
          const idx = AREA_KEYS.indexOf(selectedArea);
          if (idx === -1) return null;
          const a = areas[idx];
          return (
            <circle
              cx={a.ax}
              cy={a.ay}
              r={8}
              fill="none"
              stroke="var(--matcha-deep)"
              strokeWidth={2}
              aria-hidden="true"
            />
          );
        })()}
      </svg>

      {/* Interactive hotspot buttons (overlaid on top of the SVG) */}
      {onSelectArea && areas.map(({ area, days, tier, sig, hx, hy }) => {
        const isSelected = selectedArea === area;
        const btnLabel = `${AREA_LABELS[area]} — ${sig.label}, ${days} days`;
        // Position the 24px button centred on the hotspot coordinate
        const btnSize = 24;
        return (
          <button
            key={`btn-${area}`}
            onClick={() => onSelectArea(area)}
            aria-pressed={isSelected}
            aria-label={btnLabel}
            className="absolute rounded-pill focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              width: btnSize,
              height: btnSize,
              // Shift by pad so coordinates align with the SVG inside the padded container.
              left: hx - btnSize / 2 + pad,
              top: hy - btnSize / 2 + pad,
              backgroundColor: isSelected ? sig.cssVar : "transparent",
              border: `2px solid ${sig.cssVar}`,
              opacity: isSelected ? 1 : 0.7,
            }}
            title={btnLabel}
          >
            {/* Visually empty button — the SVG dot + label provide the visual */}
            <span className="sr-only">{btnLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
