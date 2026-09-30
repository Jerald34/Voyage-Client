"use client";
import ItineraryDayPanel from './ItineraryDayPanel';

export default function ItineraryCanvas({ itinerary, reuseDropRef }) {
  if (!itinerary) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-[60px] py-[60px] text-center text-text-soft bg-white">
        {/* Scroll / document icon */}
        <svg
          className="mb-6 opacity-40 text-text-soft"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h3 className="font-serif text-2xl text-primary mb-3">No Draft Created Yet</h3>
        <p className="text-sm max-w-[300px] leading-relaxed text-text-soft">
          Describe the trip in the chat to see the structured itinerary appear here.
        </p>
      </div>
    );
  }

  const { title, summary, status, version, days = [] } = itinerary;

  return (
    <div
      ref={reuseDropRef || undefined}
      className="p-8 bg-surface min-h-full"
    >
      <header className="mb-10">
        <div className="mb-4">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.1em] text-secondary border border-secondary px-2 py-0.5 rounded mb-3">
            {status === 'DRAFT' ? 'Draft Itinerary' : status}
          </span>
          <h1 className="font-serif text-[32px] text-primary leading-tight m-0">{title}</h1>
        </div>
        <div className="flex gap-8 pt-4 border-t border-border">
          {summary && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase text-text-soft tracking-[0.05em]">Summary</span>
              <span className="text-sm font-bold text-primary">{summary}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase text-text-soft tracking-[0.05em]">Days</span>
            <span className="text-sm font-bold text-primary">{days.length}</span>
          </div>
          {version > 1 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase text-text-soft tracking-[0.05em]">Version</span>
              <span className="text-sm font-bold text-primary">v{version}</span>
            </div>
          )}
        </div>
      </header>

      <div>
        {days.map((day, index) => (
          <div key={index} data-reuse-day={index}>
            <ItineraryDayPanel
              dayNumber={day.dayNumber}
              date={day.date}
              title={day.title}
              items={day.items}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
