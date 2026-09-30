"use client";

/**
 * 32px-tall SVG sparkline used inside KPI tiles.
 *
 * Receives a numeric array of bucket values. Renders a smooth polyline
 * with a stroke-dashoffset reveal animation on mount (one-shot, never
 * repeats — per spec §6.5).
 */
export default function Sparkline({ values = [], width = 96, height = 32, ariaHidden = true }) {
  if (!values || values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden={ariaHidden}
        className="block"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden={ariaHidden}
      className="block"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 1000,
          strokeDashoffset: 1000,
          animation: "voyage-sparkline-draw 400ms var(--ease-out) forwards"
        }}
      />
      <style>{`
        @keyframes voyage-sparkline-draw {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          polyline { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </svg>
  );
}
