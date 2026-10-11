"use client";

import { useEffect, useState } from "react";

/**
 * True once `ref`'s element has come within `rootMargin` of the viewport, and true
 * from then on. Where IntersectionObserver is missing it is true straight away.
 */
export function useInView(ref, { rootMargin = "200px" } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, inView]);

  return inView;
}

export default useInView;
