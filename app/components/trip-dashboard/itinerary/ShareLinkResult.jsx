"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "../../icons/index.js";
import ShareQRCode from "./ShareQRCode.jsx";

/** A ready share link: the URL with Copy, its QR code, and (in the app) a way to make another. */
export default function ShareLinkResult({ shareUrl, tripTitle, onGenerateAnother }) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <section className="mb-1">
      <h3 className="m-0 mb-3.5 font-sans text-[13px] font-semibold tracking-[0.01em] text-text-primary">
        Share Link Ready
      </h3>

      <div className="
        flex items-center gap-2.5
        px-3.5 py-2.5 mb-[18px]
        rounded-md bg-background border border-border/30
        sm:flex-row flex-col sm:items-center items-stretch
      ">
        <span
          className="flex-1 min-w-0 text-[12.5px] text-text-muted whitespace-nowrap overflow-hidden text-ellipsis font-mono"
          title={shareUrl}
        >
          {shareUrl}
        </span>
        <button
          type="button"
          className={`
            shrink-0 inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-[10px] border text-[12px] font-bold
            cursor-pointer whitespace-nowrap
            transition-[background,border-color,color] duration-150
            sm:justify-start justify-center
            ${copySuccess
              ? "bg-status-success/10 border-status-success/40 text-status-success"
              : "bg-surface-elevated border-border/30 text-text-muted hover:bg-surface hover:border-border/50"
            }
          `}
          onClick={handleCopyUrl}
          aria-label="Copy link"
        >
          {copySuccess ? (
            <>
              <CheckIcon width={13} height={13} strokeWidth={3} />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon width={13} height={13} strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>

      <ShareQRCode shareUrl={shareUrl} tripTitle={tripTitle} />

      {onGenerateAnother ? (
        <button
          type="button"
          className="
            block mx-auto px-3 py-1.5
            border-0 bg-transparent
            text-text-soft text-[13px] font-semibold
            underline underline-offset-[3px]
            cursor-pointer
            hover:text-primary
            transition-colors duration-150
          "
          onClick={onGenerateAnother}
        >
          Generate another link
        </button>
      ) : null}
    </section>
  );
}
