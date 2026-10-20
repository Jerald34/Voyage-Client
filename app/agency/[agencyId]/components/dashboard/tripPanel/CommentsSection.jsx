"use client";

import { useId } from "react";
import CommentCard from "./CommentCard";
import { isWaiting, orderPanelComments } from "./tripPanelFormat";

/**
 * The trip panel's comments: every comment on every link of the trip,
 * unanswered first. `focusCommentId` opens that comment's reply box.
 */
export default function CommentsSection({ comments = [], agencyId, focusCommentId = null, onReplySent }) {
  const headingId = useId();
  const { waiting, answered } = orderPanelComments(comments);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-sans text-[13px] font-semibold tracking-normal text-text-primary">
          Comments
        </h3>
        {waiting.length > 0 ? (
          <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[12px] font-semibold text-text-primary">
            {waiting.length} waiting
          </span>
        ) : null}
      </div>

      {comments.length === 0 ? (
        <p className="m-0 text-[13px] text-text-muted">
          No comments yet. Clients can comment on any stop from the shared link.
        </p>
      ) : (
        [...waiting, ...answered].map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            agencyId={agencyId}
            onReplySent={onReplySent}
            defaultReplyOpen={comment.id === focusCommentId && isWaiting(comment)}
          />
        ))
      )}
    </section>
  );
}
