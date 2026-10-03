/** Open-Meteo's free API is CC-BY 4.0: show the credit wherever weather appears. */
export default function WeatherAttribution({ attribution, className = "" }) {
  if (!attribution?.url || !attribution?.text) return null;
  return (
    <a
      href={attribution.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block py-0.5 text-[0.7rem] text-text-muted underline-offset-2 hover:underline focus-visible:underline ${className}`.trim()}
    >
      {attribution.text}
    </a>
  );
}
