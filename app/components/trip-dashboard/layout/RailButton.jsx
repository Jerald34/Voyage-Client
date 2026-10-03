"use client";

/**
 * One icon button in the app rail. On desktop its label is a tooltip that
 * shows on hover and keyboard focus; in the phone drawer the label sits
 * beside the icon. The accessible name is always `label`.
 */
export default function RailButton({ label, icon, active = false, badge = null, onClick, tourTarget }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-tour-target={tourTarget}
      onClick={onClick}
      className={[
        "group relative flex shrink-0 items-center transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "min-[901px]:h-10 min-[901px]:w-10 min-[901px]:justify-center min-[901px]:rounded-full",
        "max-[900px]:min-h-11 max-[900px]:w-full max-[900px]:gap-3 max-[900px]:rounded-xl max-[900px]:px-3",
        active ? "bg-secondary text-white dark:text-[#111416]" : "frame-tile text-text-muted hover:text-text-primary",
      ].join(" ")}
    >
      <span className="relative inline-flex" aria-hidden="true">
        {icon}
        {badge ? (
          <span className="absolute -right-2.5 -top-2 h-[18px] min-w-[18px] rounded-pill bg-secondary-strong px-1 text-center text-[11px] font-bold leading-[18px] text-on-secondary-strong">
            {badge}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={[
          "whitespace-nowrap text-[13px] font-semibold",
          "min-[901px]:pointer-events-none min-[901px]:absolute min-[901px]:left-[calc(100%+12px)] min-[901px]:top-1/2 min-[901px]:z-50 min-[901px]:-translate-y-1/2",
          "min-[901px]:rounded-md min-[901px]:bg-text-primary min-[901px]:px-2 min-[901px]:py-1 min-[901px]:text-[12px] min-[901px]:text-background",
          "min-[901px]:opacity-0 min-[901px]:transition-opacity min-[901px]:duration-150",
          "min-[901px]:group-hover:opacity-100 min-[901px]:group-focus-visible:opacity-100",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
