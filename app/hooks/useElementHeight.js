import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The live height of an element, for layouts that float one element over another
 * (the chat composer over the chat log). Returns [ref, height]; height stays 0
 * until the first measurement, or for good where ResizeObserver doesn't exist.
 */
export default function useElementHeight() {
  const [element, setElement] = useState(null);
  const [height, setHeight] = useState(0);
  const ref = useCallback((node) => setElement(node), []);
  const lastHeight = useRef(0);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const next = Math.round(entry?.borderBoxSize?.[0]?.blockSize ?? entry?.contentRect?.height ?? 0);
      if (next !== lastHeight.current) {
        lastHeight.current = next;
        setHeight(next);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [ref, height];
}
