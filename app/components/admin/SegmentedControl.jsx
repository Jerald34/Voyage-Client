"use client";

/**
 * Single-select segmented pill control.
 *  - as="tab"   → role="tablist"/role="tab" + aria-selected (view switching)
 *  - as="radio" → role="radiogroup"/role="radio" + aria-checked (filters/toggles)
 *
 * @param {{value:string,label:string,badge?:number}[]} options
 * @param {string} value
 * @param {(v:string)=>void} onChange
 * @param {string} ariaLabel
 * @param {"tab"|"radio"} [as="tab"]
 * @param {"sm"|"md"} [size="md"]
 * @param {string} [className]
 */
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  as = "tab",
  size = "md",
  className = "",
}) {
  const isTab = as === "tab";
  const pad = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm";
  return (
    <div
      role={isTab ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-pill border border-border/10 bg-surface-elevated p-1 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={isTab ? "tab" : "radio"}
            aria-selected={isTab ? active : undefined}
            aria-checked={isTab ? undefined : active}
            onClick={() => onChange(o.value)}
            className={`relative inline-flex min-h-11 items-center whitespace-nowrap rounded-pill font-semibold transition-transform active:scale-[0.97] motion-reduce:transition-none ${pad} ${
              active ? "bg-primary text-white shadow-soft" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {o.label}
            {o.badge > 0 && (
              <span className="ml-2 inline-flex min-w-[18px] items-center justify-center rounded-pill bg-secondary px-1 text-[10px] font-bold leading-[18px] text-white">
                {o.badge > 99 ? "99+" : o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
