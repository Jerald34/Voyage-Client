export default function RolePill({ role }) {
  const isOwner = role === "OWNER";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
        (isOwner
          ? "border border-border text-text-primary"
          : "text-text-muted")
      }
    >
      {role}
    </span>
  );
}
