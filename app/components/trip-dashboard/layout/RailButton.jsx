"use client";

/**
 * One icon button in the app rail. On desktop its label is a tooltip that
 * shows on hover and keyboard focus; in the phone drawer the label sits
 * beside the icon. The accessible name is `label`, plus the pending count when
 * there is a badge (the badge itself is decorative to assistive tech).
 */
export default function RailButton({ label, icon, active = false, badge = null, onClick, tourTarget }) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label}, ${badge} pending` : label}
      aria-current={active ? "page" : undefined}
      data-tour-target={tourTarget}
      onClick={onClick}
      className={[
        "group relative flex shrink-0 items-center transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "min-[900px]:h-10 min-[900px]:w-10 min-[900px]:justify-center min-[900px]:rounded-full",
        "max-[900px]:min-h-11 max-[900px]:w-full max-[900px]:gap-3 max-[900px]:rounded-xl max-[900px]:px-3",
        active
          ? "bg-secondary text-white dark:text-[#111416] max-[900px]:bg-secondary-strong max-[900px]:text-on-secondary-strong"
          : "frame-tile text-text-muted hover:text-text-primary",
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
          "min-[900px]:pointer-events-none min-[900px]:absolute min-[900px]:left-[calc(100%+12px)] min-[900px]:top-1/2 min-[900px]:z-50 min-[900px]:-translate-y-1/2",
          "min-[900px]:rounded-md min-[900px]:bg-text-primary min-[900px]:px-2 min-[900px]:py-1 min-[900px]:text-[12px] min-[900px]:text-background",
          "min-[900px]:opacity-0 min-[900px]:transition-opacity min-[900px]:duration-150",
          "min-[900px]:group-hover:opacity-100 min-[900px]:group-focus-visible:opacity-100",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
