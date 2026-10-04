"use client";
import Link from 'next/link';

export default function AgentThreadRail() {
  return (
    <div className="flex flex-col gap-8 p-5 h-full">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.1em] text-text-soft font-bold">
            Agency Workspace
          </span>
          <h2 className="text-xl m-0 text-text-primary font-serif">Voyage Premium</h2>
        </div>
        <Link href="/agency" className="text-xs text-secondary no-underline font-semibold hover:underline">
          &larr; Dashboard
        </Link>
      </header>

      <div>
        <button className="w-full px-3 py-3 bg-primary text-on-primary border-0 rounded-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition hover:-translate-y-px">
          <span className="text-base leading-none">+</span>
          New Itinerary Draft
        </button>
      </div>

      <nav>
        <h3 className="text-[11px] uppercase tracking-[0.05em] text-text-muted font-extrabold mb-4">
          Recent Threads
        </h3>
        <div className="grid gap-2 p-3 rounded-sm border border-border bg-white">
          <strong className="text-[13px] font-bold text-text-primary">No recent threads loaded</strong>
          <span className="text-[11px] text-text-soft leading-relaxed">
            Start or select an itinerary thread to populate this rail.
          </span>
        </div>
      </nav>
    </div>
  );
}
