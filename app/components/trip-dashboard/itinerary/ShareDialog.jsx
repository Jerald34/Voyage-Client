"use client";

import { useState, useEffect, useCallback } from "react";
import { listTripShares, revokeShare, createItineraryShare } from "../../../lib/api/index.js";
import { CloseIcon, CheckIcon, EyeIcon, LinkIcon, RefreshIcon } from "../../icons/index.js";
import { Spinner } from "../../ui/index.js";
import ShareLinkPanel from "./ShareLinkPanel.jsx";

function formatShareDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getShareStatus(share) {
  if (share.revokedAt) return "Revoked";
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return "Expired";
  return "Active";
}

export default function ShareDialog({
  isOpen,
  onClose,
  agencyId,
  itineraryId,
  tripId,
  tripTitle,
}) {
  const [existingShares, setExistingShares] = useState([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [sharesError, setSharesError] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(null);

  const fetchShares = useCallback(async () => {
    if (!agencyId || !tripId) return;
    setIsLoadingShares(true);
    setSharesError(null);
    try {
      const data = await listTripShares(agencyId, tripId);
      setExistingShares(Array.isArray(data?.shares) ? data.shares : []);
    } catch (err) {
      console.error("Failed to load shares:", err);
      setSharesError("Could not load existing share links.");
    } finally {
      setIsLoadingShares(false);
    }
  }, [agencyId, tripId]);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmRevokeId(null);
    fetchShares();
  }, [isOpen, fetchShares]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleRevoke = async (shareId) => {
    if (!agencyId || revokingId) return;
    setRevokingId(shareId);
    try {
      await revokeShare(agencyId, shareId);
      setConfirmRevokeId(null);
      await fetchShares();
    } catch (err) {
      console.error("Failed to revoke share:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRegenerate = async (shareId) => {
    if (!agencyId || !itineraryId || regeneratingId) return;
    setRegeneratingId(shareId);
    try {
      await createItineraryShare(agencyId, itineraryId, {});
      await revokeShare(agencyId, shareId);
      await fetchShares();
    } catch (err) {
      console.error("Failed to regenerate share:", err);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleCopyShareLink = async (token) => {
    if (!token) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/itinerary/view/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLinkSuccess(token);
      setTimeout(() => setCopyLinkSuccess(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopyLinkSuccess(token);
      setTimeout(() => setCopyLinkSuccess(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-5 bg-black/40 backdrop-blur-sm sm:items-center items-end"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="
          w-full max-w-[520px] max-h-[min(90vh,780px)]
          flex flex-col
          bg-surface-elevated
          border border-border/20
          rounded-lg shadow-strong
          overflow-hidden
          sm:rounded-lg rounded-t-lg rounded-b-none
          sm:max-h-[min(90vh,780px)] max-h-[92vh]
        "
        role="dialog"
        aria-modal="true"
        aria-label={`Share itinerary: ${tripTitle}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border/12 shrink-0">
          <div className="min-w-0">
            <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-secondary">
              Share Itinerary
            </p>
            <h2 className="m-0 font-serif text-xl leading-snug text-text-primary truncate max-w-[360px] sm:max-w-[360px] max-w-[240px]">
              {tripTitle || "Itinerary"}
            </h2>
          </div>
          <button
            type="button"
            className="
              shrink-0 w-[34px] h-[34px] grid place-items-center
              rounded-[10px] border border-border/20
              bg-surface text-text-muted
              cursor-pointer
              hover:bg-surface-elevated hover:border-border/30
              transition-colors duration-150
            "
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon width={16} height={16} strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-0">
          <ShareLinkPanel
            agencyId={agencyId}
            itineraryId={itineraryId}
            tripTitle={tripTitle}
            onShareCreated={fetchShares}
          />

          <div className="h-px bg-border/12 my-5 shrink-0" />

          <section>
            <h3 className="m-0 mb-3.5 font-sans text-[13px] font-semibold tracking-normal text-text-primary">
              Existing Share Links
            </h3>

            {isLoadingShares ? (
              <div className="flex items-center gap-2 text-[13px] text-text-soft py-2">
                <Spinner size="sm" />
                Loading…
              </div>
            ) : sharesError ? (
              <p className="m-0 mb-3 px-3.5 py-2.5 rounded-sm bg-status-danger/8 border border-status-danger/30 text-status-danger text-[13px] leading-relaxed">
                {sharesError}
              </p>
            ) : existingShares.length === 0 ? (
              <p className="m-0 text-[13px] text-text-soft py-1">
                No share links created yet.
              </p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {existingShares.map((share) => {
                  const status = getShareStatus(share);
                  const isActive = status === "Active";
                  const isConfirming = confirmRevokeId === share.id;
                  const isRevoking = revokingId === share.id;
                  const truncatedToken = share.token
                    ? `…${share.token.slice(-12)}`
                    : share.id?.slice(0, 12) ?? "—";

                  return (
                    <li
                      key={share.id}
                      className="
                        flex items-start justify-between gap-3
                        px-3.5 py-3
                        rounded-[14px]
                        bg-surface border border-border/20
                        hover:bg-surface-elevated
                        transition-colors duration-150
                        sm:flex-row flex-col sm:gap-3 gap-2.5
                      "
                    >
                      <div className="flex flex-col gap-[3px] min-w-0">
                        <span
                          className="font-mono text-[12px] font-semibold text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]"
                          title={share.token}
                        >
                          {truncatedToken}
                        </span>
                        <span className="text-[11.5px] text-text-soft">
                          Created {formatShareDate(share.createdAt)}
                        </span>
                        {share.expiresAt && (
                          <span className="text-[11.5px] text-text-soft">
                            Expires {formatShareDate(share.expiresAt)}
                          </span>
                        )}
                        {typeof share.viewCount === "number" && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-text-soft">
                            <EyeIcon width={11} height={11} strokeWidth={2} />
                            {share.viewCount} view{share.viewCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:flex-wrap flex-wrap">
                        {status === "Active" && (
                          <span className="inline-flex items-center px-2.5 py-[3px] rounded-pill text-[11px] font-extrabold tracking-[0.04em] uppercase bg-status-success/10 text-status-success border border-status-success/30">
                            Active
                          </span>
                        )}
                        {status === "Expired" && (
                          <span className="inline-flex items-center px-2.5 py-[3px] rounded-pill text-[11px] font-extrabold tracking-[0.04em] uppercase bg-status-warning/10 text-status-warning border border-status-warning/30">
                            Expired
                          </span>
                        )}
                        {status === "Revoked" && (
                          <span className="inline-flex items-center px-2.5 py-[3px] rounded-pill text-[11px] font-extrabold tracking-[0.04em] uppercase bg-status-danger/8 text-status-danger border border-status-danger/30">
                            Revoked
                          </span>
                        )}

                        {isActive && (
                          <>
                            <button
                              type="button"
                              className={`
                                shrink-0 w-8 h-8 flex items-center justify-center
                                rounded-[8px] border cursor-pointer
                                transition-[background,border-color,color] duration-150
                                sm:w-8 sm:h-8 w-full h-auto py-1.5
                                ${copyLinkSuccess === share.token
                                  ? "bg-status-success/10 border-status-success/40 text-status-success"
                                  : "bg-surface-elevated border-border/30 text-primary hover:bg-surface hover:border-border/50"
                                }
                              `}
                              onClick={() => handleCopyShareLink(share.token)}
                              aria-label="Copy share link"
                              title="Copy share link"
                            >
                              {copyLinkSuccess === share.token ? (
                                <CheckIcon width={14} height={14} strokeWidth={2.5} />
                              ) : (
                                <LinkIcon width={14} height={14} strokeWidth={2} />
                              )}
                            </button>

                            <button
                              type="button"
                              className="
                                shrink-0 inline-flex items-center gap-1.5
                                px-3 py-[5px]
                                rounded-[8px] border border-border/30
                                bg-surface-elevated text-primary text-[11.5px] font-bold
                                cursor-pointer
                                hover:not-disabled:bg-surface hover:not-disabled:border-border/50
                                disabled:opacity-60 disabled:cursor-not-allowed
                                transition-[background,border-color] duration-150
                                sm:w-auto w-full justify-center
                              "
                              disabled={regeneratingId === share.id}
                              onClick={() => handleRegenerate(share.id)}
                              title="Generate a new share link and revoke this one"
                            >
                              {regeneratingId === share.id ? (
                                <Spinner size="sm" className="w-[13px] h-[13px]" />
                              ) : (
                                <>
                                  <RefreshIcon width={13} height={13} strokeWidth={2.5} />
                                  Regenerate
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {isActive && (
                          isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-semibold text-text-muted whitespace-nowrap">
                                Revoke?
                              </span>
                              <button
                                type="button"
                                className="
                                  px-2.5 py-1
                                  rounded-[7px] border-0
                                  bg-status-danger text-white text-[11.5px] font-bold
                                  cursor-pointer
                                  disabled:opacity-60 disabled:cursor-not-allowed
                                  transition-opacity duration-150
                                "
                                disabled={isRevoking}
                                onClick={() => handleRevoke(share.id)}
                              >
                                {isRevoking ? "…" : "Yes"}
                              </button>
                              <button
                                type="button"
                                className="
                                  px-2.5 py-1
                                  rounded-[7px] border border-border/30
                                  bg-surface-elevated text-text-muted text-[11.5px] font-bold
                                  cursor-pointer
                                  hover:bg-surface
                                  transition-colors duration-150
                                "
                                onClick={() => setConfirmRevokeId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="
                                px-3 py-[5px]
                                rounded-[8px] border border-status-danger/40
                                bg-surface-elevated text-status-danger text-[11.5px] font-bold
                                cursor-pointer
                                hover:bg-status-danger/8 hover:border-status-danger/60
                                transition-[background,border-color] duration-150
                                sm:w-auto w-full
                              "
                              onClick={() => setConfirmRevokeId(share.id)}
                            >
                              Revoke
                            </button>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
