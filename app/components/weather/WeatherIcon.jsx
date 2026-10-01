const CLOUD_BASE = "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242";

/** Decorative weather icon. Callers always render the condition as text too. */
export default function WeatherIcon({ condition, size = 16, className = "" }) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
    focusable: "false",
  };

  switch (condition) {
    case "CLEAR":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case "PARTLY_CLOUDY":
      return (
        <svg {...svgProps}>
          <path d="M12 2v2m-7.07.93 1.41 1.41M20 12h2m-2.93-7.07-1.41 1.41" />
          <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
          <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
        </svg>
      );
    case "CLOUDY":
      return (
        <svg {...svgProps}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      );
    case "FOG":
      return (
        <svg {...svgProps}>
          <path d={CLOUD_BASE} />
          <path d="M16 17H7m10 4H9" />
        </svg>
      );
    case "DRIZZLE":
      return (
        <svg {...svgProps}>
          <path d={CLOUD_BASE} />
          <path d="M8 19v1m0-6v1m8 4v1m0-6v1m-4 6v1m0-6v1" />
        </svg>
      );
    case "RAIN":
    case "HEAVY_RAIN":
      return (
        <svg {...svgProps}>
          <path d={CLOUD_BASE} />
          <path d="M16 14v6M8 14v6m4-4v6" />
        </svg>
      );
    case "THUNDERSTORM":
      return (
        <svg {...svgProps}>
          <path d={CLOUD_BASE} />
          <path d="m13 12-3 5h4l-3 5" />
        </svg>
      );
    case "SNOW":
      return (
        <svg {...svgProps}>
          <path d={CLOUD_BASE} />
          <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
        </svg>
      );
  }
}
