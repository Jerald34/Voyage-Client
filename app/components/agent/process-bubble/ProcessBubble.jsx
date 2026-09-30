"use client";

import { useState, useRef, useId, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownContent from "../chat/AgentMarkdown.jsx";
import styles from "./processBubble.module.css";

// Private helper: humanize a raw tool name into title-cased words.
function humanizeToolName(name) {
  return String(name ?? "")
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Compute the margin-top class for a timeline row based on the previous entry kind.
function rowGapClass(prevKind, currentKind) {
  if (!prevKind) return "";
  if (prevKind === "tool" && currentKind === "tool") return "mt-1.5";
  if (prevKind === "thought" && currentKind === "thought") return "mt-2";
  if (prevKind === "task" && currentKind === "task") return "mt-2";
  // task ↔ tool, task ↔ thought, or thought ↔ tool
  if (prevKind === "task" || currentKind === "task") return "mt-2.5";
  return "mt-2.5";
}

export default function ProcessBubble({
  status,
  activeLabel,
  timeline,
  durationMs,
  defaultOpen = false,
  onToggle,
  msgId,
}) {
  const generatedId = useId();
  const stableId = msgId ?? generatedId;
  const timelineId = `process-timeline-${stableId}`;

  const [open, setOpen] = useState(defaultOpen);
  const prevStatusRef = useRef(status);
  const autoCollapseTimerRef = useRef(null);

  // Auto-collapse when transitioning live → done
  useEffect(() => {
    if (prevStatusRef.current === "live" && status === "done") {
      autoCollapseTimerRef.current = setTimeout(() => {
        setOpen(false);
        onToggle?.(false);
      }, 400);
    }
    prevStatusRef.current = status;
    return () => {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
      }
    };
  }, [status]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  const isLive = status === "live";
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  // Coalesce consecutive identical tool calls into one row with a count.
  // Continuation loops (e.g. add_itinerary_item once per stop) otherwise produce
  // N identical rows; this collapses them into "Add Itinerary Item ×N".
  // Thought entries are never coalesced.
  // IMPORTANT: Task entries are also never coalesced — the condition only fires
  // for tool ↔ tool same-name pairs. Tasks are id-keyed and must each render as
  // their own row so AnimatePresence can track status transitions independently.
  const groupedTimeline = (() => {
    const out = [];
    for (const entry of safeTimeline) {
      const last = out[out.length - 1];
      if (
        last &&
        entry.kind === "tool" &&
        last.kind === "tool" &&
        last.name === entry.name
      ) {
        last.count = (last.count ?? 1) + 1;
      } else {
        out.push({ ...entry, count: 1 });
      }
    }
    return out;
  })();

  return (
    <section aria-label="Agent process">
      {/* ── Header button ─────────────────────────────────────────── */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={timelineId}
        onClick={handleToggle}
        className="w-full flex items-center gap-2 pt-0.5 pb-2 py-2.5 focus-visible:ring-2 ring-secondary/40 ring-offset-1 rounded-md"
      >
        {/* Dot */}
        <span
          aria-hidden="true"
          className={[
            "pb-dot w-1.5 h-1.5 rounded-full flex-shrink-0",
            isLive
              ? `bg-secondary ${styles.dotBreathing}`
              : "pb-dot--done border border-text-soft bg-transparent rounded-full",
          ].join(" ")}
        />

        <span
          aria-live="polite"
          aria-atomic="true"
          className={[
            "flex-1 text-left text-[13px] font-medium leading-[1.4]",
            isLive ? styles.labelShimmer : "text-text-soft",
          ].join(" ")}
        >
          {activeLabel}
        </span>

        {/* Chevron */}
        <motion.svg
          viewBox="0 0 24 24"
          width={12}
          height={12}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden="true"
          className="flex-shrink-0 text-text-soft"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 30, mass: 0.8 }}
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      {/* ── Timeline region ────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { type: "spring", stiffness: 240, damping: 30, mass: 1 },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { type: "spring", stiffness: 240, damping: 30, mass: 1 },
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              id={timelineId}
              role="region"
              aria-label="Process timeline"
              className="relative pb-1"
            >
              {/* Vertical rule */}
              <span
                className="absolute left-[3px] top-0 bottom-0 w-px"
                style={{ background: "rgb(var(--color-border-rgb) / 0.25)" }}
                aria-hidden="true"
              />

              {/* Timeline rows */}
              <AnimatePresence mode="popLayout">
                {groupedTimeline.map((entry, index) => {
                  const prevKind = index > 0 ? groupedTimeline[index - 1].kind : null;
                  const gap = rowGapClass(prevKind, entry.kind);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                      }}
                      className={gap}
                    >
                      {entry.kind === "tool" ? (
                        <div className="pb-tool flex items-center gap-1.5 h-6 pl-3.5 text-[12px] font-medium text-text-muted dark:text-text-muted">
                          <span className="text-secondary/70 select-none" aria-hidden="true">→</span>
                          <span>{humanizeToolName(entry.name)}</span>
                          {entry.count > 1 && (
                            <motion.span
                              key={entry.count}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                              className="ml-0.5 text-[10.5px] font-semibold text-secondary/80 tabular-nums select-none"
                              aria-label={`${entry.count} times`}
                            >
                              ×{entry.count}
                            </motion.span>
                          )}
                        </div>
                      ) : entry.kind === "task" ? (() => {
                        const isRunning = entry.status === "RUNNING";
                        const isCompleted = entry.status === "COMPLETED";
                        const isFailed = entry.status === "FAILED";

                        const dotClass = isRunning
                          ? `bg-secondary ${styles.dotBreathing}`
                          : isCompleted
                            ? "bg-secondary"
                            : isFailed
                              ? "bg-rose-600/70"
                              : "border border-text-soft bg-transparent"; // PENDING

                        const labelClass = isCompleted ? "line-through opacity-60" : "";

                        return (
                          <div className="pb-task flex items-center gap-1.5 h-6 pl-3.5 text-[12px] font-medium text-text-muted dark:text-text-muted">
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`}
                            />
                            <span className={labelClass}>{entry.label}</span>
                          </div>
                        );
                      })() : (
                        <div className="pb-thought pl-3.5 text-[12.5px] font-normal leading-[1.55] text-text-soft dark:text-text-muted [&_p]:m-0 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-text-muted dark:[&_strong]:text-text-primary [&_em]:italic [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4 [&_li]:text-[12.5px] [&_li]:leading-[1.5] [&_h1]:text-[13.5px] [&_h2]:text-[13px] [&_h3]:text-[12.5px] [&_h4]:text-[12.5px] [&_h5]:text-[12.5px] [&_h6]:text-[12.5px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-1.5 [&_h2]:mt-1.5 [&_h3]:mt-1 [&_h1]:text-text-muted [&_h2]:text-text-muted [&_h3]:text-text-muted dark:[&_h1]:text-text-primary dark:[&_h2]:text-text-primary dark:[&_h3]:text-text-primary [&_code]:text-[11.5px] [&_pre]:text-[11px] [&_pre]:my-1 [&_blockquote]:my-1 [&_blockquote]:py-1 [&_blockquote]:text-[12px]">
                          <MarkdownContent content={entry.text} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
