import { RefreshIcon } from "../../icons/index.js";

export default function ReuseButton({
  onClick,
  count,
  disabled = false,
  mode = "editor",
}) {
  const isDisabled = disabled || count === 0;
  const badgeLabel = count > 99 ? "99+" : count;
  // In the itinerary header the label follows the header's own width, like the
  // buttons beside it (ItineraryHeader is the size container); elsewhere it
  // follows the viewport.
  const inHeader = mode === "clientItinerary";
  // In the header the button presses like its neighbours (ItineraryHeader's
  // ACTION_BUTTON): the same gap, named properties, 150ms ease-out, and a press scale.
  const spacing = inHeader ? "gap-1.5" : "gap-2";
  const motion = inHeader
    ? "transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none"
    : "transition-all duration-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? "No rated trips yet" : "Open rated trips picker"}
      aria-label="Open rated history picker"
      className={`inline-flex items-center justify-center ${spacing} min-w-[40px] min-h-[40px] ${inHeader ? "px-2 @min-[720px]:px-3" : "px-2 sm:px-3.5"} rounded-lg border border-border/20 bg-surface-elevated text-text-primary text-[0.85rem] font-bold cursor-pointer ${motion} ${
        isDisabled
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : "hover:bg-surface hover:border-border/40"
      }`}
    >
      <RefreshIcon width={14} height={14} aria-hidden="true" />
      <span className={inHeader ? "hidden @min-[720px]:inline" : "hidden sm:inline"}>Reuse</span>
      <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-secondary/20 text-secondary text-[0.7rem] font-bold leading-none flex-shrink-0">
        {badgeLabel}
      </span>
    </button>
  );
}
