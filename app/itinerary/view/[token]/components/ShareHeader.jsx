"use client";

import ThemeToggle from "../../../../components/theme/ThemeToggle";
import VoyageLogo from "../../../../components/brand/VoyageLogo.jsx";

const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted";

/**
 * Public share header on the app's glass frame. The page is client-facing, so
 * the agency's own brand leads; the Voyage logo only stands in when there is none.
 */
export default function ShareHeader({ brand }) {
  return (
    <header className="relative z-20 flex flex-shrink-0 items-center justify-between gap-3 border-b border-[color:var(--frame-border)] bg-[var(--frame-panel)] px-6 py-3 text-text-primary backdrop-blur-[16px] max-sm:px-4 max-sm:py-2.5">
      <ShareBrand brand={brand} />
      <span className={`${EYEBROW} max-sm:hidden`}>Shared itinerary</span>
      <ThemeToggle />
    </header>
  );
}

function ShareBrand({ brand }) {
  if (brand?.type === "personal") {
    return (
      <div className="flex min-w-0 flex-col leading-tight">
        <span className={EYEBROW}>Shared by</span>
        <span className="truncate text-[16px] font-semibold max-sm:text-[14px]">{brand.displayName || "Traveler"}</span>
      </div>
    );
  }

  // Legacy responses have no brand; unknown brand types fall through to Voyage.
  const isAgency = !brand || brand.type === "agency";
  if (isAgency && (brand?.name || brand?.logoUrl)) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt={brand.name || "Agency logo"} className="h-7 w-auto flex-shrink-0 object-contain" />
        ) : null}
        {brand.name ? (
          <span className="truncate text-[16px] font-semibold max-sm:text-[14px]">{brand.name}</span>
        ) : null}
      </div>
    );
  }

  return <VoyageLogo className="h-8 w-auto" />;
}

/** Footer credit, shared by the itinerary and the error states. */
export function PoweredByVoyage({ className = "" }) {
  return (
    <p className={`m-0 flex items-center justify-center gap-2 ${EYEBROW} ${className}`.trim()}>
      <span>Powered by</span>
      <VoyageLogo className="h-5 w-auto text-text-primary" />
    </p>
  );
}
