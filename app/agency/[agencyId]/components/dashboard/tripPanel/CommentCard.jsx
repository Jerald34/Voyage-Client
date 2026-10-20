"use client";

import { useEffect, useId, useRef, useState } from "react";
import { replyToShareComment } from "@/app/lib/api/index.js";
import { ReplyIcon } from "@/app/components/icons/index.js";
import { formatCommentTime } from "@/app/lib/formatters.js";
import { commentPlace, isWaiting } from "./tripPanelFormat";

// Same press feedback the rest of the dashboard uses; a disabled button doesn't move.
const PRESS = "transition-[color,background-color,border-color,opacity,scale] duration-150 ease-out enabled:active:scale-[0.97]";

/**
 * One client comment in the trip panel: who, where on the trip, what they
 * said, and either the agency's reply or a Reply box. `defaultReplyOpen` opens
 * (and focuses) the box at once, for the comment the panel was opened for.
 */
export default function CommentCard({ comment, agencyId, onReplySent, defaultReplyOpen = false }) {
  const [replyOpen, setReplyOpen] = useState(defaultReplyOpen);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const waiting = isWaiting(comment);
  const errorId = useId();
  const replyButtonRef = useRef(null);
  const returnFocusToReply = useRef(false);

  // Closing the box (Cancel or Escape) unmounts the focused textarea; put focus back
  // on the Reply button so keyboard users keep their place in the list.
  useEffect(() => {
    if (!replyOpen && returnFocusToReply.current) {
      returnFocusToReply.current = false;
      replyButtonRef.current?.focus();
    }
  }, [replyOpen]);

  const closeReply = () => {
    returnFocusToReply.current = true;
    setReplyOpen(false);
    setReplyError(null);
  };

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
    <article
      data-comment-id={comment.id}
      aria-label={`Comment from ${comment.authorName || "Client"}`}
      className={`dashboard-card flex flex-col gap-2 px-4 py-3 ${waiting ? "border-l-[3px] border-l-status-warning" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-strong text-[0.75rem] font-extrabold text-on-secondary-strong"
        >
          {String(comment.authorName || "?")[0].toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="text-[0.85rem] font-bold text-text-primary">{comment.authorName || "Client"}</span>
            <span className="text-[0.73rem] text-text-muted">{formatCommentTime(comment.createdAt)}</span>
          </span>
          <span className="text-[12px] text-text-muted">{commentPlace(comment)}</span>
        </div>
        <span
          className={`inline-flex flex-shrink-0 items-center rounded-md px-2 py-[3px] text-[11px] font-semibold text-text-primary ${
            waiting ? "bg-status-warning/15" : "bg-status-success/15"
          }`}
        >
          {waiting ? "Waiting" : "Replied"}
        </span>
      </div>

      <p className="m-0 whitespace-pre-wrap break-words pl-[2.375rem] text-[0.88rem] leading-[1.55] text-text-primary">{comment.content}</p>

      {comment.agencyReply ? (
        <div className="ml-[2.375rem] flex flex-col gap-1 border-l-[3px] border-secondary bg-background px-3.5 py-2.5">
          <span className="flex items-center gap-[5px] text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-secondary-strong">
            <ReplyIcon width={12} height={12} aria-hidden="true" />
            Your reply
          </span>
          <p className="m-0 whitespace-pre-wrap break-words text-[0.85rem] leading-[1.5] text-text-primary">{comment.agencyReply}</p>
          {comment.agencyRepliedAt ? (
            <span className="text-[0.72rem] text-text-muted">{formatCommentTime(comment.agencyRepliedAt)}</span>
          ) : null}
        </div>
      ) : (
        <div className="ml-[2.375rem] flex flex-col">
          {!replyOpen ? (
            <button
              ref={replyButtonRef}
              type="button"
              onClick={() => setReplyOpen(true)}
              className={`inline-flex min-h-9 items-center gap-[5px] self-start rounded-lg border border-border bg-surface-elevated px-2.5 text-[0.78rem] font-bold text-text-primary hover:border-secondary/50 hover:bg-background pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
            >
              <ReplyIcon width={12} height={12} aria-hidden="true" />
              Reply
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                className="box-border w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2.5 text-[0.85rem] leading-relaxed text-text-primary focus:border-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                placeholder="Write a reply…"
                aria-label={`Reply to ${comment.authorName || "the client"}`}
                aria-invalid={replyError ? true : undefined}
                aria-describedby={replyError ? errorId : undefined}
                aria-busy={submitting || undefined}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                autoFocus
                // readOnly, not disabled: a disabled textarea drops focus, so a failed send would strand the keyboard.
                readOnly={submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    // Close the box, not the whole panel.
                    e.stopPropagation();
                    closeReply();
                  }
                }}
              />
              {replyError ? (
                <span id={errorId} role="alert" className="text-[0.78rem] font-semibold text-status-danger">
                  {replyError}
                </span>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReply}
                  className={`min-h-9 rounded-lg border border-border bg-surface-elevated px-3 text-[0.8rem] font-bold text-text-primary hover:bg-background pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || !replyText.trim()}
                  onClick={handleSubmit}
                  className={`min-h-9 rounded-lg bg-secondary-strong px-4 text-[0.8rem] font-bold text-on-secondary-strong hover:opacity-90 pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-45 ${PRESS}`}
                >
                  {submitting ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
