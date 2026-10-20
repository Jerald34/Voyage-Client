const STATUS_LABELS = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED_INTERNAL: "Approved",
  ARCHIVED: "Archived",
};

const STATUS_BG = {
  DRAFT: "color-mix(in srgb, var(--warning) 12%, transparent)",
  IN_REVIEW: "color-mix(in srgb, var(--accent) 12%, transparent)",
  APPROVED_INTERNAL: "color-mix(in srgb, var(--success) 12%, transparent)",
  ARCHIVED: "rgb(var(--color-border-rgb) / 0.08)",
};

// The label sits on a 12% tint of its own status colour, and under the row's
// hover wash. Coloured text (terracotta, green, amber) drops below 4.5:1 at
// 12px there, so the label reads in the body colour. The tint and the leading
// dot carry the status; the muted colour already clears 4.5:1 for archived.
const STATUS_TEXT = {
  DRAFT: "rgb(var(--color-text-rgb))",
  IN_REVIEW: "rgb(var(--color-text-rgb))",
  APPROVED_INTERNAL: "rgb(var(--color-text-rgb))",
  ARCHIVED: "rgb(var(--color-text-muted-rgb))",
};

const STATUS_DOT = {
  DRAFT: "var(--warning)",
  IN_REVIEW: "var(--accent)",
  APPROVED_INTERNAL: "var(--success)",
  ARCHIVED: "rgb(var(--color-text-muted-rgb))",
};

/** A trip's status as a tinted chip with a leading dot; nothing for no status. */
export default function TripStatusChip({ status }) {
  if (!status) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.04em]"
      style={{
        backgroundColor: STATUS_BG[status] ?? "rgb(var(--color-border-rgb) / 0.08)",
        color: STATUS_TEXT[status] ?? "rgb(var(--color-text-muted-rgb))",
      }}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: STATUS_DOT[status] ?? "rgb(var(--color-text-muted-rgb))" }}
      />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
