import React from "react";
import type { AreaKey } from "../../domain/types";
import { AREA_LABELS } from "../../domain/types";

interface AreaTagProps {
  area: AreaKey;
  /** "tint"  → matcha-tint bg, matcha-deep text (default, for signal contexts)
   *  "muted" → neutral-bg bg, ink-2 text (for low-emphasis / dark backgrounds) */
  variant?: "tint" | "muted";
  /** Pass aria-hidden="true" to hide the chip from the accessibility tree (e.g. inside a link
   *  whose name is already conveyed by adjacent text). */
  "aria-hidden"?: true;
}

/**
 * Small monospace uppercase area tag chip.
 * Matches the tiny labelled area pills visible on the Person screen and report cards.
 */
export function AreaTag({ area, variant = "tint", "aria-hidden": ariaHidden }: AreaTagProps) {
  const variantClass =
    variant === "muted"
      ? "bg-neutral-bg text-neutral"
      : "bg-matcha-tint text-matcha-deep";

  return (
    <span
      aria-hidden={ariaHidden}
      className={`inline-block font-mono text-xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${variantClass}`}
    >
      {AREA_LABELS[area]}
    </span>
  );
}
