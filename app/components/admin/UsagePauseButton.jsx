"use client";

import { useState } from "react";
import { activePause, shortUntil } from "../../lib/agentPause.js";
import AccountActionDialog from "./AccountActionDialog.jsx";
import PauseAgentDialog from "./PauseAgentDialog.jsx";

const BUTTON =
  "self-start rounded-sm border border-border/20 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface/80";

/**
 * Pause agent / Resume agent for one person in the Usage drill-in.
 *
 * `row` is a Usage user row (`id`, `label`, `agentPause`). `spend` ({ label, costUsd, runCount }, optional) is
 * what they spent in the range the Usage tab is showing; the pause dialog shows it. After an action the button goes by the
 * account the server just returned, so it flips at once; `onChanged` reloads the usage, and once the
 * reloaded row arrives (a new `agentPause`) the row is the authority again.
 */
export default function UsagePauseButton({ row, spend = null, onChanged }) {
  const [dialog, setDialog] = useState(null); // "pause" | "resume-agent" | null
  // What the last action returned, and the row value it replaced. Once the row's own pause is
  // anything other than that value the reload has landed and the answer is ignored.
  const [answer, setAnswer] = useState(null);

  const shown = answer && answer.replaced === row.agentPause ? answer.pause : row.agentPause;
  const pause = activePause(shown);
  const account = { id: row.id, displayName: row.label };

  const done = (updated) => {
    setDialog(null);
    if (updated && "agentPause" in updated) setAnswer({ replaced: row.agentPause, pause: updated.agentPause });
    onChanged?.();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {pause && (
        <p className="text-sm text-text-primary">
          <span className="font-semibold text-status-warning">{shortUntil(pause)}</span>
          {pause.reason && <span className="block break-words text-text-muted">{pause.reason}</span>}
        </p>
      )}
      <button type="button" className={BUTTON} onClick={() => setDialog(pause ? "resume-agent" : "pause")}>
        {pause ? "Resume agent" : "Pause agent"}
      </button>
      <PauseAgentDialog open={dialog === "pause"} account={account} spend={spend} onClose={() => setDialog(null)} onDone={done} onStale={onChanged} />
      <AccountActionDialog
        open={dialog === "resume-agent"}
        action="resume-agent"
        account={account}
        onClose={() => setDialog(null)}
        onDone={done}
        onStale={onChanged}
      />
    </div>
  );
}
