// Step counter for the register wizard.
// currentStep: 1 | "verify" | "type" | 2
export default function WizardProgress({ currentStep, step }) {
  // Support legacy `step` prop for backward compat while callers migrate
  const active = currentStep ?? step;

  const accountActive = active === 1 || active === "verify" || active === "type" || active === 2;
  const typeActive = active === "type" || active === 2;
  const agencyActive = active === 2;

  return (
    <div className="flex items-center justify-center gap-0">
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black tabular-nums leading-none transition-colors duration-250 ${
            accountActive
              ? "bg-secondary text-white"
              : "bg-[rgba(148,163,184,0.32)] text-text-soft"
          }`}
        >
          1
        </span>
        <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-250 ${accountActive ? "text-text-primary" : "text-text-soft"}`}>
          Account
        </span>
      </div>
      <div className="w-8 h-0.5 bg-border mx-2" />
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black tabular-nums leading-none transition-colors duration-250 ${
            typeActive
              ? "bg-secondary text-white"
              : "bg-[rgba(148,163,184,0.32)] text-text-soft"
          }`}
        >
          2
        </span>
        <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-250 ${typeActive ? "text-text-primary" : "text-text-soft"}`}>
          Account type
        </span>
      </div>
      <div className="w-8 h-0.5 bg-border mx-2" />
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black tabular-nums leading-none transition-colors duration-250 ${
            agencyActive
              ? "bg-secondary text-white"
              : "bg-[rgba(148,163,184,0.32)] text-text-soft"
          }`}
        >
          3
        </span>
        <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-250 ${agencyActive ? "text-text-primary" : "text-text-soft"}`}>
          Agency
        </span>
      </div>
    </div>
  );
}
