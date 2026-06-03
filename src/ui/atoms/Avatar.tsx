import React from "react";

interface AvatarProps {
  initials: string;
  hue: number;
  /** Size in pixels — default 36 */
  size?: number;
}

/**
 * Round avatar chip with a per-person oklch colour wash and the person's
 * initials in ink. The hue is a numeric degree value (0-360) passed from the
 * Person model; the full oklch() expression is a dynamic computed value,
 * NOT a brand hex literal, so the token guardrail does not flag it.
 */
export function Avatar({ initials, hue, size = 36 }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-pill font-mono font-bold text-ink select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundColor: `oklch(0.90 0.05 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}
