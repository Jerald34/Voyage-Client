import { CLIENT_REQUIREMENTS } from "../../lib/systemRequirements.js";

/** The minimum and recommended setup for using Voyage, from the shared requirements list. */
export default function SystemRequirementsTable() {
  return (
    <div className="overflow-x-auto">
      <table aria-label="System requirements" className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold"><span className="sr-only">Requirement</span></th>
            <th scope="col" className="py-2 pr-3 font-semibold">Minimum</th>
            <th scope="col" className="py-2 font-semibold">Recommended</th>
          </tr>
        </thead>
        <tbody>
          {CLIENT_REQUIREMENTS.map((row) => (
            <tr key={row.label} className="border-b border-border/60 align-top last:border-0">
              <th scope="row" className="py-2.5 pr-3 font-semibold text-text-primary">{row.label}</th>
              <td className="py-2.5 pr-3 text-text-primary">{row.minimum}</td>
              <td className="py-2.5 text-text-muted">{row.recommended}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
