"use client";

import { useState, useEffect } from "react";

// Tailwind's `max-[900px]:` variant compiles to `width < 900px`, so a viewport
// of exactly 900px is desktop. 899.98px keeps this hook in step with the CSS.
const MOBILE_QUERY = "(max-width: 899.98px)";

export default function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);

    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
