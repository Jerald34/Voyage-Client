"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, LinkIcon } from "../../icons/index.js";
import ShareQRCode from "./ShareQRCode.jsx";

const COPIED_MS = 2000;

/** Copies `text` through a throwaway off-screen textarea; true only if the browser says it copied. */
function copyViaTextarea(text) {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  try {
    document.body.appendChild(el);
    el.select();
    return document.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    el.remove();
  }
}

/** A ready share link: the URL with Copy, its QR code, and (in the app) a way to make another. */
export default function ShareLinkResult({ shareUrl, tripTitle, onGenerateAnother }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const copyButtonRef = useRef(null);
  const copiedTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  const showCopied = () => {
    setCopySuccess(true);
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopySuccess(false), COPIED_MS);
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopied();
    } catch {
      const copied = copyViaTextarea(shareUrl);
      copyButtonRef.current?.focus();
      if (copied) showCopied();
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
          ref={copyButtonRef}
          type="button"
          className={`
            shrink-0 inline-flex items-center gap-1.5
            px-3 py-1.5 pointer-coarse:min-h-11
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
        >
          {copySuccess ? (
            <>
              <CheckIcon width={13} height={13} strokeWidth={3} />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon width={13} height={13} strokeWidth={2} />
              Copy{" "}<span className="sr-only">link</span>
            </>
          )}
        </button>
        {/* Always mounted so the change below is announced to screen readers. */}
        <span role="status" className="sr-only">
          {copySuccess ? "Link copied" : ""}
        </span>
      </div>

      <ShareQRCode shareUrl={shareUrl} tripTitle={tripTitle} />

      {onGenerateAnother ? (
        <button
          type="button"
          className="
            block mx-auto px-3 py-1.5 pointer-coarse:min-h-11
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
