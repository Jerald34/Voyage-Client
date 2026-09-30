import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the API client at module level so the hook imports the mocked fetchApi.
vi.mock("../app/lib/api/client", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "../app/lib/api/client";
import { useRatedHistory } from "../app/components/ratedHistory/hooks/useRatedHistory";

const TRIP_LIST_RESPONSE = {
  trips: [
    { id: "trip-1", destination: "Tokyo", duration: 7, rating: 4.8 },
    { id: "trip-2", destination: "Bali", duration: 5, rating: 4.6 },
  ],
  hasMore: false,
};

/**
 * Tiny consumer that surfaces the hook's `trips` into the DOM so we can assert
 * on rendered output. We exercise the hook with `render()` (not `renderHook`)
 * because React only performs StrictMode's intentional mount -> unmount -> mount
 * double-invocation for a real component tree; @testing-library/react's
 * `renderHook` does not reproduce that passive-effect remount.
 */
function TripsProbe({ agencyId, filters }) {
  const { trips } = useRatedHistory({ agencyId, filters });
  return <div data-testid="count">{trips.length}</div>;
}

beforeEach(() => {
  fetchApi.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRatedHistory under React.StrictMode", () => {
  it("surfaces fetched trips despite StrictMode's setup -> cleanup -> setup cycle", async () => {
    // Mirror the real fetchApi: honor the AbortSignal and reject like fetch does.
    fetchApi.mockImplementation(
      (_url, options = {}) =>
        new Promise((resolve, reject) => {
          if (options.signal?.aborted) {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
          }
          resolve(TRIP_LIST_RESPONSE);
        })
    );

    render(
      <StrictMode>
        <TripsProbe agencyId="agency-1" filters={{}} />
      </StrictMode>
    );

    // The list request must resolve AND its result must reach state, even though
    // StrictMode mounts, cleans up (aborts), then re-mounts the same hook.
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("2")
    );
  });
});
