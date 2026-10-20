"use client";

/**
 * TripSlideOver — the dashboard's trip panel: a right-side drawer with the
 * trip at a glance (status, client, dates, travelers), its share link (views,
 * rating, expiry, Extend) and every client comment with an inline reply.
 *
 * `focus` says what the person clicked for: { type: "comment", id } scrolls to
 * that comment with its reply box open, { type: "share" } scrolls to the share
 * link, null starts at the top.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/app/components/icons/index.js";
import { useTripPreview } from "@/app/hooks/useTripPreview.js";
import CommentsSection from "./tripPanel/CommentsSection";
import SharedLinkSection from "./tripPanel/SharedLinkSection";
import { describeTripLine } from "./tripPanel/tripPanelFormat";
import TripStatusChip from "./widgets/TripStatusChip";

// Same press feedback the rest of the dashboard uses.
const PRESS = "transition-[color,background-color,border-color,opacity,scale] duration-150 ease-out active:scale-[0.97]";

// ─── Focus containment ───────────────────────────────────────────────────────

const TABBABLE_SELECTOR =
  'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/** True when Tab can land on the element: enabled, not inert, and actually rendered. */
function isTabbable(element, root) {
  if (element.matches(":disabled")) return false;
  if (element instanceof HTMLInputElement && element.type === "hidden") return false;
  if (getComputedStyle(element).visibility === "hidden") return false;
  for (let node = element; node; node = node.parentElement) {
    if (node.hidden || node.hasAttribute("inert") || getComputedStyle(node).display === "none") return false;
    if (node === root) break;
  }
  return true;
}

function tabbablesIn(root) {
  return [...root.querySelectorAll(TABBABLE_SELECTOR)].filter((element) => isTabbable(element, root));
}

// ─── Finding and showing what was clicked for ────────────────────────────────

/** A comment's card in the panel. Ids are compared as attribute values, never pasted into a selector. */
function findCommentCard(root, commentId) {
  if (!root || commentId == null) return null;
  const id = String(commentId);
  return [...root.querySelectorAll("[data-comment-id]")].find((element) => element.getAttribute("data-comment-id") === id) ?? null;
}

/**
 * Scrolls only the panel's own list. `scrollIntoView` may also scroll the page
 * under the fixed panel. The jump is instant, which also suits reduced motion.
 */
function scrollWithin(container, target, block) {
  if (!container || !target) return;
  const box = container.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const PADDING = 16; // the list's py-4
  const fromTop = rect.top - box.top;
  const centered = fromTop - (box.height - rect.height) / 2;
  container.scrollTop += block === "center" && rect.height < box.height ? centered : fromTop - PADDING;
}

// ─── Load failure notice ─────────────────────────────────────────────────────

function LoadAlert({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-[12px] bg-status-danger/10 border border-status-danger/20 px-4 py-3 text-sm text-status-danger flex items-center gap-2"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded px-1 min-h-6 pointer-coarse:min-h-11 font-bold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * `returnFocusRef` (optional) names where focus goes on close when the element
 * that opened the panel has left the page, e.g. a poll dropped its row while
 * the panel was open. Without it, focus is only returned to a surviving opener.
 * `onChanged()` (optional) runs after a reply or an extension is saved, so the
 * dashboard can reload what still needs the agent. `onReplied` is its old name,
 * still honoured until both dashboards pass `onChanged`.
 */
export default function TripSlideOver({
  isOpen,
  onClose,
  agencyId,
  tripId,
  tripTitle = "Trip",
  subtitle = null,
  focus = null,
  onOpenFull,
  returnFocusRef = undefined,
  onChanged = undefined,
  onReplied = undefined,
}) {
  const { data, error, loading, reload, update } = useTripPreview({ agencyId, tripId, enabled: isOpen });
  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);
  // Where focus rests while the list's own controls (the Retry button) are swapped out.
  const listRef = useRef(null);
  const shareSectionRef = useRef(null);

  // Each opening is a fresh visit. The hook keeps a trip's data between visits,
  // so without this the sections would keep their old state: a reply box that
  // should open for the clicked comment, or an earlier "Link extended" note.
  // Derived during render (not in an effect), so StrictMode's double render agrees.
  const [visit, setVisit] = useState({ open: isOpen, count: isOpen ? 1 : 0 });
  if (visit.open !== isOpen) setVisit({ open: isOpen, count: isOpen ? visit.count + 1 : visit.count });
  const visitKey = `${tripId ?? ""}:${visit.count}`;

  // The newest committed data, for handlers that run after an await.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Read at close time, so a parent passing a fresh ref object each render cannot re-run the focus effect.
  const returnFocusRefLatest = useRef(returnFocusRef);
  useEffect(() => {
    returnFocusRefLatest.current = returnFocusRef;
  }, [returnFocusRef]);

  // ── Focus: remember the opener, and send focus back on close ──
  // Whatever had focus when the panel opened (a calendar day, a to-do row) is
  // where the person was, so return there if it is still on the page. If it is
  // not, use the fallback the parent named. Keyed on isOpen alone: switching to
  // another trip while open keeps the original opener.
  useEffect(() => {
    if (!isOpen) return undefined;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;
    return () => {
      if (!opener) return;
      if (opener.isConnected) {
        opener.focus();
        return;
      }
      const fallback = returnFocusRefLatest.current?.current;
      if (fallback?.isConnected) fallback.focus();
    };
  }, [isOpen]);

  // ── Focus: into the panel on open, and again when it switches trips ──
  // Declared after the effect above so the opener is read before focus moves.
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen, tripId]);

  // ── Focus: Tab and Shift+Tab cycle inside the open panel (aria-modal) ──
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleTab = (e) => {
      if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const panel = panelRef.current;
      if (!panel) return;
      const tabbables = tabbablesIn(panel);
      if (tabbables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const active = document.activeElement;
      if (!active || !panel.contains(active)) {
        // Focus is outside the panel (or on the page body): bring it in.
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      // Wrap only when nothing is left to tab to in this direction.
      const direction = e.shiftKey ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
      const hasNext = tabbables.some((el) => el !== active && active.compareDocumentPosition(el) & direction);
      if (!hasNext) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Retry swaps its own alert for the spinner, which would drop focus to <body>
  // inside an aria-modal dialog. Park focus on the list first.
  const retry = useCallback(() => {
    listRef.current?.focus();
    reload();
  }, [reload]);

  // Close on Escape, unless the person is typing a reply (Escape closes that box instead).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key !== "Escape") return;
      if (e.target instanceof HTMLTextAreaElement) return;
      onClose?.();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // ── Once loaded, bring what was clicked for into view (once per visit) ──
  // Declared after the focus-in effect, so when the trip is already loaded the
  // reply box wins over the Close button in the same commit. The box focuses
  // itself as it mounts (autoFocus); this scrolls its card into view and
  // re-focuses the box in case the Close button took focus since. A comment
  // that is not on the page yet (a refresh may bring it) is tried again on the
  // next data. focusKey stands in for `focus`, which parents may pass as a
  // fresh object each render.
  const focusKey = focus ? `${focus.type}:${focus.id ?? ""}` : "";
  const targetKey = focusKey ? `${visitKey}|${focusKey}` : "";
  const shownTargetRef = useRef("");
  useEffect(() => {
    if (!isOpen || !data || !targetKey || shownTargetRef.current === targetKey) return;
    const isComment = focus?.type === "comment";
    const target = isComment ? findCommentCard(panelRef.current, focus.id) : focus?.type === "share" ? shareSectionRef.current : null;
    if (!target) return;
    shownTargetRef.current = targetKey;
    scrollWithin(listRef.current, target, isComment ? "center" : "start");
    if (isComment) target.querySelector("textarea")?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data, targetKey]);

  // Saved changes are already on screen. A throwing dashboard handler must not
  // reach the reply's catch and report "Failed to send reply"; log it instead.
  const notify = onChanged ?? onReplied;
  const notifyChanged = useCallback(() => {
    try {
      notify?.();
    } catch (err) {
      console.error("TripSlideOver: onChanged threw after a saved change", err);
    }
  }, [notify]);

  // "Reply sent" for screen readers. Sending removes the reply box (and may move
  // the card to the answered group), which drops focus to <body>; the effect
  // below puts it on the card instead.
  const [replyNotice, setReplyNotice] = useState(null); // { visitKey, commentId, text }

  const handleReplySent = useCallback(
    (commentId, content) => {
      const author = dataRef.current?.comments?.find((c) => c.id === commentId)?.authorName;
      update((prev) => ({
        ...prev,
        comments: (prev.comments ?? []).map((c) =>
          c.id === commentId ? { ...c, agencyReply: content, agencyRepliedAt: new Date().toISOString(), status: "ADDRESSED" } : c,
        ),
      }));
      setReplyNotice({ visitKey, commentId, text: `Reply sent to ${author || "the client"}.` });
      notifyChanged();
    },
    [update, notifyChanged, visitKey],
  );

  useEffect(() => {
    if (!isOpen || !replyNotice || replyNotice.visitKey !== visitKey) return;
    const panel = panelRef.current;
    const active = document.activeElement;
    // Focus survived the send (say, the person already moved on): leave it.
    if (panel && active && active !== document.body && panel.contains(active)) return;
    const card = findCommentCard(panel, replyNotice.commentId);
    if (!card) return;
    // Focusable by script only, so it never joins the Tab order.
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
  }, [isOpen, replyNotice, visitKey]);

  const handleExtended = useCallback(
    (share) => {
      // The section only reports a saved link. Check it is still this trip's link:
      // the answer can land after the panel moved to another trip.
      update((prev) => (prev.share && prev.share.id === share.id ? { ...prev, share: { ...prev.share, ...share } } : prev));
      notifyChanged();
    },
    [update, notifyChanged],
  );

  const title = data?.trip?.title ?? tripTitle;
  const tripLine = describeTripLine(data?.trip, subtitle);
  const notice = replyNotice && replyNotice.visitKey === visitKey ? replyNotice.text : "";

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

      {/* While closed the panel only sits off-screen, so `inert` keeps its buttons out of the tab order and `aria-hidden` out of the accessibility tree. */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-label={`Trip: ${title}`}
        aria-modal="true"
        aria-hidden={isOpen ? undefined : true}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col border-l border-border/10 bg-background shadow-2xl transition-transform duration-300 [transition-timing-function:var(--ease-drawer)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex flex-shrink-0 items-start gap-3 border-b border-border/10 px-5 py-4">
          <div className="min-w-0 flex-1">
            {data?.trip?.status ? (
              <div className="mb-1.5">
                <TripStatusChip status={data.trip.status} />
              </div>
            ) : null}
            <h2 className="line-clamp-2 break-words font-sans text-base font-semibold leading-snug tracking-normal text-text-primary">{title}</h2>
            {tripLine ? <p className="mt-0.5 break-words text-xs text-text-muted">{tripLine}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`-mr-1.5 mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text-primary pointer-coarse:min-h-11 pointer-coarse:min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${PRESS}`}
            aria-label="Close panel"
          >
            <CloseIcon width={18} height={18} aria-hidden="true" />
          </button>
        </header>

        {/* Always mounted, so screen readers are already listening when a reply is sent. */}
        <p role="status" aria-live="polite" className="sr-only">
          {notice}
        </p>

        {/* Not a tab stop: Retry moves focus here before its alert unmounts, so it stays inside the dialog. */}
        <div
          ref={listRef}
          role="region"
          aria-label="Trip details"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4 focus:outline-none"
        >
          {loading && !data && !error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <div aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              <p className="text-xs text-text-muted">Loading trip…</p>
            </div>
          ) : null}

          {!loading && error ? <LoadAlert message="Couldn't load this trip." onRetry={retry} /> : null}

          {data ? (
            <>
              <SharedLinkSection
                key={visitKey}
                ref={shareSectionRef}
                agencyId={agencyId}
                share={data.share ?? null}
                onExtended={handleExtended}
              />
              <div aria-hidden="true" className="border-t border-border/10" />
              {/* Remounted per visit and target: CommentCard reads defaultReplyOpen only when it mounts. */}
              <CommentsSection
                key={`${visitKey}|${focusKey}`}
                comments={data.comments ?? []}
                agencyId={agencyId}
                focusCommentId={focus?.type === "comment" ? focus.id : null}
                onReplySent={handleReplySent}
              />
            </>
          ) : null}
        </div>

        <div className="flex-shrink-0 border-t border-border/10 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onOpenFull?.(tripId);
              onClose?.();
            }}
            className={`w-full rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-sm font-bold text-secondary-strong hover:bg-secondary/10 pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${PRESS}`}
          >
            Open in Planner <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  );
}
