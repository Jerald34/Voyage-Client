// app/components/settings/settingsFields.jsx
// Shared building blocks for Settings and the Agency tab's Profile section.

export function formatReadOnlyValue(value) {
  const text = String(value ?? "").trim();
  return text || "Not set";
}

// Theme tokens, so the pills read in light and dark mode. An 8% tint keeps
// every status colour at 4.5:1 (warning drops below it at 10%).
export function getStatusClass(status) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "VERIFIED") {
    return "bg-status-success/8 text-status-success border-status-success/30";
  }
  if (normalized === "PENDING" || normalized === "INVITED") {
    return "bg-status-warning/8 text-status-warning border-status-warning/30";
  }
  return "bg-text-primary/5 text-text-muted border-border/20";
}

export function getFieldClass(readOnly = false) {
  return [
    "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    "bg-background text-text-primary placeholder:text-text-soft/70",
    "focus:border-secondary focus:ring-2 focus:ring-secondary/20",
    readOnly ? "border-border/70 bg-surface-elevated/70" : "border-border",
    readOnly ? "cursor-not-allowed opacity-90" : "",
  ].join(" ");
}

export function Panel({ eyebrow, title, description, children, className = "" }) {
  return (
    <section className={`rounded-[24px] border border-border bg-surface/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{eyebrow}</p>
        <h2 className="mt-1 font-sans text-lg font-semibold text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, value, readOnly = false, id }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">{label}</span>
      <input id={id} className={getFieldClass(readOnly)} value={value} readOnly={readOnly} />
    </label>
  );
}

export function TextInputField({ label, id, value, onChange, placeholder, readOnly = false, autoComplete, type = "text", inputMode, pattern, maxLength }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">{label}</span>
      <input
        id={id}
        className={getFieldClass(readOnly)}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
      />
    </label>
  );
}
