"use client";

import { useEffect, useId, useState } from "react";
import { fetchUsageRun, fetchUsageRuns } from "../../../lib/api/admin.js";
import Button from "../../ui/Button.jsx";
import { GROUP_FILTER_KEY, fmtInt, fmtUsd, roleTagLine } from "./usageFormat.js";

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const plural = (n, one, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;

const IDLE_CALLS = { runId: null, status: "idle", calls: [], error: null };

function ErrorNote({ message, onRetry, className = "" }) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-2 rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger ${className}`}>
      <span>{message}</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function CallTable({ state, onRetry, label }) {
  if (state.status === "error") return <ErrorNote message={state.error} onRetry={onRetry} className="mx-3 mb-3" />;
  if (state.status !== "loaded") return <p className="px-3 pb-3 text-xs text-text-muted">Loading calls…</p>;
  if (!state.calls.length) return <p className="px-3 pb-3 text-xs text-text-muted">No per-call detail was recorded for this run.</p>;

  return (
    <div className="overflow-x-auto px-3 pb-3">
      <table className="w-full text-xs tabular-nums">
        <caption className="sr-only">Model calls for {label}</caption>
        <thead className="text-text-soft">
          <tr>
            <th scope="col" className="py-1 text-left font-semibold">#</th>
            <th scope="col" className="py-1 text-left font-semibold">Step</th>
            <th scope="col" className="py-1 text-right font-semibold">Prompt</th>
            <th scope="col" className="py-1 text-right font-semibold">Cached</th>
            <th scope="col" className="py-1 text-right font-semibold">Output</th>
            <th scope="col" className="py-1 text-right font-semibold">Thinking</th>
            <th scope="col" className="py-1 text-right font-semibold">Total</th>
            <th scope="col" className="py-1 text-right font-semibold">Cost</th>
          </tr>
        </thead>
        <tbody className="text-text-muted">
          {state.calls.map((c) => (
            <tr key={c.callIndex} className="border-t border-border/8">
              <td className="py-1 pr-2">{c.callIndex + 1}</td>
              <td className="py-1 pr-2">
                {c.phase === "synthesis" ? "Final answer" : "Tool step"}
                {/* In the cell, not a hover tooltip, so keyboard and screen-reader users get the model too. */}
                <span className="block break-all text-[11px] text-text-soft">{c.modelName}</span>
              </td>
              <td className="py-1 text-right">{fmtInt(c.promptTokens)}</td>
              <td className="py-1 text-right">{fmtInt(c.cachedTokens)}</td>
              <td className="py-1 text-right">{fmtInt(c.outputTokens)}</td>
              <td className="py-1 text-right">{fmtInt(c.thoughtsTokens)}</td>
              <td className="py-1 text-right text-text-primary">{fmtInt(c.totalTokens)}</td>
              <td className="py-1 text-right">{c.costUsd === null ? "Unpriced" : fmtUsd(c.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Side-panel body for one usage table row: its runs, each expandable into the model calls behind it.
 * A run's button is a disclosure (aria-expanded / aria-controls) and keeps focus when it opens or closes,
 * so there is no separate "back" step to manage. Loading and results are announced through one
 * persistent status region; failures use role="alert".
 *
 * `actions` is a slot for row-level buttons (Part 3 adds Pause agent).
 */
export default function UsageDrillIn({ row, groupBy, range, actions = null }) {
  const panelIdBase = useId();
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState(null);
  const [openRunId, setOpenRunId] = useState(null);
  const [callsState, setCallsState] = useState(IDLE_CALLS);
  const [announcement, setAnnouncement] = useState("");
  const [runsAttempt, setRunsAttempt] = useState(0);
  const [callsAttempt, setCallsAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRuns(null);
    setError(null);
    setOpenRunId(null);
    setAnnouncement(`Loading runs for ${row.label}.`);
    fetchUsageRuns({ range, [GROUP_FILTER_KEY[groupBy]]: row.id })
      .then((data) => {
        if (cancelled) return;
        const list = data?.runs || [];
        setRuns(list);
        setAnnouncement(list.length ? `${plural(list.length, "run")} loaded.` : "No runs found for this range.");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Couldn't load runs.");
        setAnnouncement("");
      });
    return () => {
      cancelled = true;
    };
  }, [row.id, row.label, groupBy, range, runsAttempt]);

  useEffect(() => {
    if (!openRunId) {
      setCallsState(IDLE_CALLS);
      return undefined;
    }
    let cancelled = false;
    setCallsState({ runId: openRunId, status: "loading", calls: [], error: null });
    setAnnouncement("Loading model calls.");
    fetchUsageRun(openRunId)
      .then((data) => {
        if (cancelled) return;
        const calls = data?.calls || [];
        setCallsState({ runId: openRunId, status: "loaded", calls, error: null });
        setAnnouncement(calls.length ? `${plural(calls.length, "model call")} loaded.` : "This run has no model call detail.");
      })
      .catch((e) => {
        if (cancelled) return;
        setCallsState({ runId: openRunId, status: "error", calls: [], error: e?.message || "Couldn't load this run." });
        setAnnouncement("");
      });
    return () => {
      cancelled = true;
    };
  }, [openRunId, callsAttempt]);

  const toggleRun = (id) => {
    if (openRunId === id) {
      setOpenRunId(null);
      setAnnouncement("");
    } else {
      setOpenRunId(id);
    }
  };

  const sub = groupBy === "user" ? roleTagLine(row) : groupBy === "chat" ? row.agencyName : "";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {sub && <p className="-mt-2 text-sm text-text-muted">{sub}</p>}
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Cost", fmtUsd(row.costUsd)],
          ["Runs", `${fmtInt(row.runCount)}${row.failedRunCount ? ` · ${row.failedRunCount} failed` : ""}`],
          ["Tokens", fmtInt(row.totalTokens)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-sm border border-border/10 bg-surface p-3">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="m-0 mt-1 text-sm font-semibold tabular-nums text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      {actions}

      <section>
        <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-text-muted">Runs (newest first, up to 50)</h3>
        {error && <ErrorNote message={error} onRetry={() => setRunsAttempt((n) => n + 1)} />}
        {!runs && !error && <p className="text-sm text-text-muted">Loading runs…</p>}
        {runs && runs.length === 0 && <p className="text-sm text-text-muted">No runs in this range.</p>}
        {runs && runs.length > 0 && (
          <ul className="flex flex-col gap-2">
            {runs.map((run) => {
              const open = openRunId === run.id;
              const title = run.threadTitle || "Untitled chat";
              const panelId = `${panelIdBase}-${run.id}`;
              return (
                <li key={run.id} className="rounded-sm border border-border/10 bg-surface">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? panelId : undefined}
                    onClick={() => toggleRun(run.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-sm p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
                      <span className="block text-xs text-text-muted">
                        {fmtWhen(run.createdAt)} · {plural(run.callCount, "call")}
                        {groupBy !== "user" && run.userLabel ? ` · ${run.userLabel}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-none flex-col items-end gap-1 text-xs tabular-nums">
                      <span className="text-sm text-text-primary">{fmtUsd(run.costUsd)}</span>
                      <span className="text-text-muted">{fmtInt(run.totalTokens)} tokens</span>
                      {run.status === "FAILED" && <span className="font-semibold text-status-danger">Failed</span>}
                      {!run.costComplete && <span className="text-status-warning">Cost incomplete</span>}
                    </span>
                  </button>
                  {open && (
                    <div id={panelId}>
                      <CallTable state={callsState.runId === run.id ? callsState : IDLE_CALLS} onRetry={() => setCallsAttempt((n) => n + 1)} label={title} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
