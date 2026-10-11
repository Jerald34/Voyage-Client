"use client";

import { useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { DownloadIcon } from "../../icons/index.js";

export default function ShareQRCode({ shareUrl, tripTitle }) {
  const qrCanvasRef = useRef(null);

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(tripTitle || "itinerary").replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center gap-3.5 mb-4">
      <div className="p-4 rounded-md bg-white border border-border/20 shadow-soft inline-block leading-none">
        <QRCodeSVG
          value={shareUrl}
          size={160}
          bgColor="#ffffff"
          fgColor="#223843"
          level="M"
          title={`QR code for ${tripTitle || "this itinerary"}`}
        />
      </div>

      <div
        ref={qrCanvasRef}
        className="absolute opacity-0 pointer-events-none -left-[9999px] -top-[9999px]"
      >
        <QRCodeCanvas
          value={shareUrl}
          size={400}
          bgColor="#ffffff"
          fgColor="#223843"
          level="M"
        />
      </div>

      <button
        type="button"
        className="
          inline-flex items-center gap-2
          px-[18px] py-2.5 pointer-coarse:min-h-11
          rounded-md border border-border/30
          bg-surface-elevated text-primary text-[13px] font-bold
          cursor-pointer
          hover:bg-background hover:border-border/50 hover:-translate-y-px
          transition-[background,border-color,transform] duration-150
        "
        onClick={handleDownloadQR}
      >
        <DownloadIcon width={14} height={14} strokeWidth={2.5} />
        Download QR as PNG
      </button>
    </div>
  );
}
