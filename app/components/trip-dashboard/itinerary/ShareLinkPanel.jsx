"use client";

import { useState } from "react";
import { createItineraryShare } from "../../../lib/api/index.js";
import { LinkIcon } from "../../icons/index.js";
import { Spinner } from "../../ui/index.js";
import ShareLinkResult from "./ShareLinkResult.jsx";

export default function ShareLinkPanel({ agencyId, itineraryId, tripTitle, onShareCreated }) {
  const [dialogState, setDialogState] = useState("create"); // "create" | "result"
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [generatedShare, setGeneratedShare] = useState(null);

  const shareUrl = generatedShare?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/itinerary/view/${generatedShare.token}`
    : "";

  const handleGenerate = async () => {
    if (!agencyId || !itineraryId) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const payload = {};
      if (clientName.trim()) payload.clientName = clientName.trim();
      if (clientEmail.trim()) payload.clientEmail = clientEmail.trim();
      if (expiresAt) payload.expiresAt = new Date(expiresAt + "T23:59:59").toISOString();
      const data = await createItineraryShare(agencyId, itineraryId, payload);
      setGeneratedShare(data?.share ?? null);
      setDialogState("result");
      onShareCreated?.();
    } catch (err) {
      console.error("Failed to create share:", err);
      setGenerateError("Failed to generate share link. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    setDialogState("create");
    setGeneratedShare(null);
    setClientName("");
    setClientEmail("");
    setExpiresAt("");
  };

  if (dialogState === "result") {
    return <ShareLinkResult shareUrl={shareUrl} tripTitle={tripTitle} onGenerateAnother={handleBack} />;
  }

  return (
    <section className="mb-1">
      <h3 className="m-0 mb-3.5 text-[13px] font-bold tracking-[0.01em] text-text-primary">
        Generate Share Link
      </h3>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="share-client-name"
            className="text-[12px] font-bold text-text-primary flex items-center gap-1.5"
          >
            Client Name
            <span className="text-[10px] font-semibold text-text-muted lowercase tracking-normal">
              optional
            </span>
          </label>
          <input
            id="share-client-name"
            type="text"
            placeholder="e.g. Smith Family"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="
              w-full px-3.5 py-2.5
              rounded-md border border-border/40
              bg-surface text-[14px] text-text-primary
              placeholder:text-text-soft/60
              focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/14 focus:bg-surface-elevated
              transition-[border-color,box-shadow] duration-150
              box-border
            "
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="share-client-email"
            className="text-[12px] font-bold text-text-primary flex items-center gap-1.5"
          >
            Client Email
            <span className="text-[10px] font-semibold text-text-muted lowercase tracking-normal">
              optional
            </span>
          </label>
          <input
            id="share-client-email"
            type="email"
            placeholder="e.g. client@email.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="
              w-full px-3.5 py-2.5
              rounded-md border border-border/40
              bg-surface text-[14px] text-text-primary
              placeholder:text-text-soft/60
              focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/14 focus:bg-surface-elevated
              transition-[border-color,box-shadow] duration-150
              box-border
            "
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="share-expires"
            className="text-[12px] font-bold text-text-primary flex items-center gap-1.5"
          >
            Expiration Date
            <span className="text-[10px] font-semibold text-text-muted lowercase tracking-normal">
              optional
            </span>
          </label>
          <input
            id="share-expires"
            type="date"
            value={expiresAt}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="
              w-full px-3.5 py-2.5
              rounded-md border border-border/40
              bg-surface text-[14px] text-text-primary
              placeholder:text-text-soft/60
              focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/14 focus:bg-surface-elevated
              transition-[border-color,box-shadow] duration-150
              box-border
            "
          />
        </div>
      </div>

      {generateError && (
        <p className="m-0 mb-3 px-3.5 py-2.5 rounded-sm bg-status-danger/8 border border-status-danger/30 text-status-danger text-[13px] leading-relaxed">
          {generateError}
        </p>
      )}

      <button
        type="button"
        className="
          w-full inline-flex items-center justify-center gap-2
          px-5 py-3
          border-0 rounded-md
          bg-secondary text-white text-[14px] font-bold
          shadow-strong
          cursor-pointer
          hover:not-disabled:-translate-y-px hover:not-disabled:shadow-lg
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-[transform,box-shadow,background] duration-150
        "
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Spinner size="md" className="w-[14px] h-[14px]" />
            Generating…
          </>
        ) : (
          <>
            <LinkIcon width={14} height={14} strokeWidth={2.5} />
            Generate Share Link
          </>
        )}
      </button>
    </section>
  );
}
