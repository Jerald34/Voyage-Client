"use client";

/**
 * TripSlideOver — right-side drawer that opens over the dashboard
 * when the user clicks Reply on a worklist row.
 *
 * Comments are grouped by Day → Activity (matching CommentsPanel UX).
 * Each parent comment gets its own inline reply input.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listTripShares,
  listShareComments,
  replyToShareComment,
} from "@/app/lib/api/index.js";
import { ChatIcon, CloseIcon, ReplyIcon } from "@/app/components/icons/index.js";
import { formatCommentTime } from "@/app/lib/formatters.js";

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusClasses(status) {
  if (status === "ADDRESSED")
    return "bg-[#f0fdf4] text-[#166534] border border-[#dcfce7]";
  if (status === "SEEN")
    return "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]";
  return "bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]";
}

function getStatusLabel(status) {
  if (status === "ADDRESSED") return "Addressed";
  if (status === "SEEN") return "Seen";
  return "Pending";
}

// ─── Single comment card ─────────────────────────────────────────────────────

function CommentCard({
  comment,
  agencyId,
  onReplySent,
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState(null);

  const isPending = comment.status === "PENDING";
  const hasReply = !!comment.agencyReply;

  const handleSubmit = async () => {
    const content = replyText.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setReplyError(null);
    try {
      await replyToShareComment(agencyId, comment.id, content);
      setReplyText("");
      setReplyOpen(false);
      onReplySent?.(comment.id, content);
    } catch {
      setReplyError("Failed to send reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={[
        "dashboard-card px-4 py-3.5 flex flex-col gap-2.5 transition-shadow duration-200",
        isPending && !hasReply
          ? "border-l-[3px] border-l-secondary"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Author row */}
      <div className="flex items-start gap-2.5">
        <div
          className={
            "w-8 h-8 rounded-full bg-secondary text-white " +
            "flex items-center justify-center text-[0.75rem] " +
            "font-extrabold flex-shrink-0 shadow-sm mt-0.5"
          }
        >
          {String(comment.authorName || "?")[0].toUpperCase()}
        </div>
        <div className="flex flex-col gap-px flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.85rem] font-bold text-text-primary">
              {comment.authorName || "Client"}
            </span>
            <span className="text-[0.73rem] text-text-soft">
              {formatCommentTime(comment.createdAt)}
            </span>
          </div>
          {/* Context chip: item title */}
          {comment.itemTitle && (
            <span
              className={
                "inline-flex items-center self-start px-2 py-[3px] mt-1 rounded-[6px] " +
                "text-[0.65rem] font-extrabold tracking-[0.04em] uppercase " +
                "bg-[#eef2ff] text-[#3730a3] border border-[#e0e7ff] " +
                "max-w-[220px] truncate"
              }
              title={comment.itemTitle}
            >
              {comment.itemTitle}
            </span>
          )}
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center px-2 py-[3px] rounded-[6px] text-[0.65rem] font-extrabold tracking-[0.04em] uppercase ${getStatusClasses(comment.status)}`}
        >
          {getStatusLabel(comment.status)}
        </span>
      </div>

      {/* Comment text */}
      <p className="text-[0.88rem] text-text-primary leading-[1.55] m-0 pl-[2.375rem]">
        {comment.content}
      </p>

      {/* Existing agency reply */}
      {hasReply && (
        <div
          className={
            "ml-[2.375rem] bg-background rounded-[10px] px-3.5 py-2.5 " +
            "flex flex-col gap-1 border-l-[3px] border-secondary"
          }
        >
          <div
            className={
              "flex items-center gap-[5px] text-[0.72rem] " +
              "font-extrabold uppercase tracking-[0.04em] text-secondary"
            }
          >
            <ReplyIcon width={12} height={12} />
            Your reply
          </div>
          <p className="text-[0.85rem] text-text-primary leading-[1.5] m-0">
            {comment.agencyReply}
          </p>
          {comment.agencyRepliedAt && (
            <span className="text-[0.72rem] text-text-soft mt-0.5">
              {formatCommentTime(comment.agencyRepliedAt)}
            </span>
          )}
        </div>
      )}

      {/* Reply controls */}
      {!hasReply && (
        <div className="ml-[2.375rem] flex flex-col">
          {!replyOpen ? (
            <button
              type="button"
              className={
                "inline-flex items-center gap-[5px] px-2.5 py-[5px] " +
                "rounded-lg border border-border bg-surface-elevated text-text-soft " +
                "text-[0.78rem] font-bold cursor-pointer transition-all " +
                "duration-150 self-start hover:bg-background " +
                "hover:text-text-primary hover:border-secondary/50"
              }
              onClick={() => setReplyOpen(true)}
            >
              <ReplyIcon width={12} height={12} />
              Reply
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                className={
                  "w-full px-3 py-2.5 rounded-[10px] border border-border " +
                  "bg-background text-[0.85rem] font-[inherit] text-text-primary " +
                  "resize-none leading-relaxed transition-all duration-200 box-border " +
                  "focus:outline-none focus:border-secondary focus:bg-surface " +
                  "focus:shadow-[0_0_0_3px_rgba(215,122,97,0.1)]"
                }
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    setReplyOpen(false);
                    setReplyError(null);
                  }
                }}
                disabled={submitting}
              />
              {replyError && (
                <span className="text-[0.78rem] text-[#dc2626] font-semibold">
                  {replyError}
                </span>
              )}
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  className={
                    "px-3 py-1.5 rounded-lg border border-border bg-surface-elevated " +
                    "text-text-soft text-[0.8rem] font-bold cursor-pointer " +
                    "transition-all duration-150 hover:bg-background hover:text-text-primary"
                  }
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    "px-4 py-1.5 rounded-lg border-none bg-secondary text-white " +
                    "text-[0.8rem] font-bold cursor-pointer transition-all duration-150 " +
                    "hover:enabled:bg-[#c4674e] disabled:opacity-45 disabled:cursor-not-allowed"
                  }
                  disabled={submitting || !replyText.trim()}
                  onClick={handleSubmit}
                >
                  {submitting ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TripSlideOver({
  isOpen,
  onClose,
  agencyId,
  tripId,
  tripTitle = "Trip",
  subtitle = null,
  onOpenFull,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all comments across shares ──
  const fetchComments = useCallback(async () => {
    if (!agencyId || !tripId) return;
    setLoading(true);
    setError(null);
    try {
      const sharesRes = await listTripShares(agencyId, tripId);
      const shares = Array.isArray(sharesRes?.shares) ? sharesRes.shares : [];

      const commentArrays = await Promise.all(
        shares.map((share) =>
          listShareComments(agencyId, share.id)
            .then((r) =>
              Array.isArray(r?.comments)
                ? r.comments.map((c) => ({ ...c, shareId: share.id }))
                : [],
            )
            .catch(() => []),
        ),
      );
      setComments(commentArrays.flat());
    } catch (err) {
      setError(err?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [agencyId, tripId]);

  useEffect(() => {
    if (isOpen && tripId) {
      fetchComments();
    }
  }, [isOpen, tripId, fetchComments]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Optimistic reply update — avoids a full refetch on send
  const handleReplySent = useCallback((commentId, content) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              agencyReply: content,
              agencyRepliedAt: new Date().toISOString(),
              status: "ADDRESSED",
            }
          : c,
      ),
    );
  }, []);

  // ── Two-level grouping: Day → Activity ──
  const grouped = useMemo(() => {
    // Only show parent comments (not agency reply children).
    // The API returns agencyReply on the parent, so parentId children
    // are raw client sub-comments; we include them too but indent.
    const parents = comments.filter((c) => !c.parentId);

    const dayMap = new Map();
    for (const c of parents) {
      const dayKey = c.dayNumber != null ? String(c.dayNumber) : "general";
      const itemKey = c.itemTitle || "__day__";
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Map());
      const itemMap = dayMap.get(dayKey);
      if (!itemMap.has(itemKey)) itemMap.set(itemKey, []);
      itemMap.get(itemKey).push(c);
    }

    const dayKeys = [...dayMap.keys()]
      .filter((k) => k !== "general")
      .sort((a, b) => Number(a) - Number(b));

    const ordered = [];

    const buildSubgroups = (itemMap) => {
      const subs = [];
      for (const [itemKey, list] of itemMap) {
        if (itemKey === "__day__") continue;
        subs.push({ key: itemKey, title: itemKey, comments: list });
      }
      if (itemMap.has("__day__")) {
        subs.push({
          key: "__day__",
          title: "General",
          comments: itemMap.get("__day__"),
        });
      }
      return subs;
    };

    for (const k of dayKeys) {
      const itemMap = dayMap.get(k);
      if (!itemMap.size) continue;
      ordered.push({ key: k, label: `Day ${k}`, subgroups: buildSubgroups(itemMap) });
    }

    if (dayMap.has("general")) {
      const itemMap = dayMap.get("general");
      if (itemMap.size) {
        ordered.push({
          key: "general",
          label: "General",
          subgroups: buildSubgroups(itemMap),
        });
      }
    }

    return ordered;
  }, [comments]);

  const totalCount = comments.filter((c) => !c.parentId).length;
  const pendingCount = comments.filter(
    (c) => !c.parentId && c.status === "PENDING",
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Trip comments: ${tripTitle}`}
        aria-modal="true"
        className={`fixed top-0 right-0 z-[61] flex h-full w-full max-w-md flex-col border-l border-border/10 bg-background shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <header className="flex items-start gap-3 border-b border-border/10 px-5 py-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/10 border border-secondary/20 text-secondary text-[0.65rem] font-extrabold uppercase tracking-[0.05em] mb-1.5">
              TRIP
            </span>
            <h2 className="text-base font-extrabold text-text-primary truncate">
              {tripTitle}
            </h2>
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          {/* Comment count badges */}
          <div className="flex items-center gap-1.5 mt-1">
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill bg-secondary/15 text-secondary text-[0.7rem] font-extrabold">
                {totalCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill bg-[#fef9c3] text-[#854d0e] border border-[#fef08a] text-[0.7rem] font-extrabold"
                title={`${pendingCount} pending`}
              >
                {pendingCount} pending
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 mt-0.5 rounded-lg p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            aria-label="Close panel"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        {/* ── Comment list ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 min-h-0">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              <p className="text-xs text-text-muted">Loading comments…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-[12px] bg-status-danger/10 border border-status-danger/20 px-4 py-3 text-sm text-status-danger flex items-center gap-2">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={fetchComments}
                className="font-bold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <ChatIcon
                width={40}
                height={40}
                strokeWidth={1.5}
                className="text-text-muted/40"
              />
              <div>
                <p className="text-sm font-semibold text-text-muted m-0">
                  No comments yet
                </p>
                <p className="text-xs text-text-soft mt-1 m-0">
                  Share the itinerary with your client to start a conversation.
                </p>
              </div>
            </div>
          )}

          {/* Grouped comments */}
          {!loading &&
            !error &&
            grouped.map(({ key, label, subgroups }) => (
              <div key={key} className="flex flex-col gap-3">
                {/* Day label */}
                <div
                  className={
                    "text-[0.75rem] font-extrabold uppercase " +
                    "tracking-[0.06em] text-text-soft pb-1.5 border-b border-border"
                  }
                >
                  {label}
                </div>

                {subgroups.map((sub) => (
                  <div key={sub.key} className="flex flex-col gap-2">
                    {/* Activity sub-heading (skip "General" clutter when only one) */}
                    {sub.title !== "General" && (
                      <div
                        className={
                          "text-[0.7rem] font-bold uppercase " +
                          "tracking-[0.05em] text-text-soft/80 pl-1"
                        }
                      >
                        {sub.title}
                      </div>
                    )}

                    {sub.comments.map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        agencyId={agencyId}
                        onReplySent={handleReplySent}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* ── Footer: open full view ── */}
        <div className="border-t border-border/10 px-5 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onOpenFull?.(tripId);
              onClose?.();
            }}
            className={
              "w-full rounded-lg border border-secondary/30 bg-secondary/5 " +
              "px-4 py-2.5 text-sm font-bold text-secondary " +
              "hover:bg-secondary/10 transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 " +
              "focus-visible:ring-secondary focus-visible:ring-offset-2"
            }
          >
            Open in Command Center →
          </button>
        </div>
      </aside>
    </>
  );
}
