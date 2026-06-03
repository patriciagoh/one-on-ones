interface SparklineProps {
  /** Array of numeric values to plot. Sentiment is 1-5; talk% is 0-100. */
  values: number[];
  /** Accessible summary — e.g. "Sentiment trend: 4, 3, 4, 5 over last 4 meetings" */
  ariaLabel: string;
  /** Width of the SVG in pixels — default 80 */
  width?: number;
  /** Height of the SVG in pixels — default 24 */
  height?: number;
}

/**
 * Inline SVG polyline sparkline.
 *
 * Accessibility: role="img" + aria-label describe the data trend textually so
 * the chart is not invisible to assistive technology (WCAG 1.1.1).
 *
 * Stroke uses var(--matcha-deep); the baseline rule uses var(--line).
 * No raw hex literals — token rule satisfied.
 */
export function Sparkline({
  values,
  ariaLabel,
  width = 80,
  height = 24,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          x1={0}
          y1={height - 2}
          x2={width}
          y2={height - 2}
          stroke="var(--line)"
          strokeWidth={1}
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Map values to SVG coordinates.
  // Y is inverted: higher value = closer to top (y=0).
  const padY = 3;
  const innerH = height - padY * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = values.length === 1 ? width / 2 : i * step;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
    >
      {/* baseline */}
      <line
        x1={0}
        y1={height - 2}
        x2={width}
        y2={height - 2}
        stroke="var(--line)"
        strokeWidth={1}
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--matcha-deep)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
