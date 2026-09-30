"use client";

/**
 * Sticky admin header: serif section title (left) + segmented tab control (right).
 * Subtle glass over the app gradient — the only glass surface in the admin data area.
 * The per-section toolbar is rendered by each section as its own slim sub-row.
 */
export default function AdminTopBar({ title, tabs }) {
  return (
    <div
      className="sticky top-0 z-20 -mx-3 mb-4 flex flex-col gap-3 border-b border-border/10 px-3 pb-3 backdrop-blur-md sm:-mx-5 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:-mx-6 lg:px-6"
      style={{ background: "var(--glass-bg)", paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <h1 className="font-serif text-2xl text-text-primary sm:text-[1.7rem]">{title}</h1>
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs}
      </div>
    </div>
  );
}
