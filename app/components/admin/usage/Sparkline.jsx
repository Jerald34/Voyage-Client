"use client";

/**
 * Minimal SVG sparkline. Renders nothing if fewer than 2 points.
 * @param {number[]} values
 * @param {string} [className]
 * @param {string} [testId]
 */
export default function Sparkline({ values = [], className = "", testId }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / span) * h).toFixed(2)}`)
    .join(" ");
  return (
    <svg
      data-testid={testId}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`h-7 w-full ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
