import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import useMobileViewport from "../app/components/trip-dashboard/mobile/useMobileViewport.js";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("useMobileViewport", () => {
  it("treats exactly 900px as desktop, matching Tailwind's `max-[900px]:` (width < 900px)", () => {
    const matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    window.matchMedia = matchMedia;

    renderHook(() => useMobileViewport());

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 899.98px)");
  });

  it("reports a matching viewport as mobile", () => {
    window.matchMedia = (query) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    const { result } = renderHook(() => useMobileViewport());

    expect(result.current).toBe(true);
  });
});
