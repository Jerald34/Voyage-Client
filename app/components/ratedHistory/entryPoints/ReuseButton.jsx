import { RefreshIcon } from "../../icons/index.js";

export default function ReuseButton({
  onClick,
  count,
  disabled = false,
  mode = "editor",
}) {
  const isDisabled = disabled || count === 0;
  const badgeLabel = count > 99 ? "99+" : count;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? "No rated trips yet" : "Open rated trips picker"}
      aria-label="Open rated history picker"
      className={`inline-flex items-center justify-center gap-2 min-w-[40px] min-h-[40px] px-2 sm:px-3.5 rounded-lg border border-border/20 bg-surface-elevated text-text-primary text-[0.85rem] font-bold cursor-pointer transition-all duration-200 ${
        isDisabled
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : "hover:bg-surface hover:border-border/40"
      }`}
    >
      <RefreshIcon width={14} height={14} aria-hidden="true" />
      <span className="hidden sm:inline">Reuse</span>
      <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-secondary/20 text-secondary text-[0.7rem] font-bold leading-none flex-shrink-0">
        {badgeLabel}
      </span>
    </button>
  );
}
