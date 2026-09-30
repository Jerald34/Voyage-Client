/**
 * reuseSlashCommand.smoke.test.jsx
 *
 * Smoke tests for Stage 6C — ReuseSlashCommand.
 *
 * Verifies:
 *   1. Autocomplete dropdown appears when composerInput is "/", "/r", or "/reuse"
 *   2. Autocomplete does NOT appear for plain text, post-prefix characters, or
 *      mid-message slashes.
 *   3. Picking `reuse` (click) clears the composer and opens the picker.
 *   4. Successful confirm path posts a SYSTEM_VISIBLE recap.
 *   5. Error path (HTTP 410) posts a SYSTEM_VISIBLE error recap.
 *
 * The Stage 4 picker is mocked to a tiny stub that calls
 * `onConfirmInsertions` synchronously when its confirm button is clicked.
 * The Stage 5A useRatedHistory hook is mocked to return an empty trip list
 * (the slash flow doesn't depend on its data for the autocomplete path).
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useRef } from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock(
  "../app/components/ratedHistory/hooks/useRatedHistory.js",
  () => ({
    useRatedHistory: () => ({
      trips: [],
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: () => {},
      getDetail: () => Promise.resolve(null),
      refetch: () => {},
    }),
  })
);

// Mock the picker so the slash command can invoke its confirm callback
// without rendering the full Stage 4 tree.
vi.mock(
  "../app/components/ratedHistory/RatedHistoryPicker.jsx",
  () => ({
    default: ({ isOpen, onClose, onConfirmInsertions }) =>
      isOpen ? (
        <div data-testid="mock-picker" role="dialog">
          <button
            type="button"
            data-testid="mock-picker-confirm"
            onClick={() =>
              onConfirmInsertions(
                { kind: "day", dayIds: ["day-7"], sourceTripId: "src-trip-1" },
                { comment: "" }
              )
            }
          >
            Confirm
          </button>
          <button type="button" data-testid="mock-picker-close" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null,
  })
);

import ReuseSlashCommand from "../app/components/ratedHistory/entryPoints/ReuseSlashCommand.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Harness({ composerInputInit = "", onSystemVisibleMessage, onInserted }) {
  // Use a stateful wrapper so we can drive composerInput from tests.
  const textareaRef = useRef(null);
  const [value, setValue] = useReactState(composerInputInit);
  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        data-testid="textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <ReuseSlashCommand
        composerInput={value}
        setComposerInput={setValue}
        textareaRef={textareaRef}
        tripId="trip-1"
        agencyId="agency-1"
        targetItineraryId="itin-1"
        currentVersion={3}
        targetItinerary={{ id: "itin-1", days: [{ dayNumber: 1, items: [] }] }}
        onSystemVisibleMessage={onSystemVisibleMessage}
        onInserted={onInserted}
      />
    </div>
  );
}

// Avoid importing useState at the top so the mock factory above doesn't need it.
import { useState as useReactState } from "react";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReuseSlashCommand — smoke", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockReset?.();
    if (!global.fetch || !global.fetch.mockReset) {
      global.fetch = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. autocomplete appears when composer is exactly '/'", () => {
    render(
      <ReuseSlashCommand
        composerInput="/"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();
  });

  it("2. autocomplete appears for '/r'", () => {
    render(
      <ReuseSlashCommand
        composerInput="/r"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();
  });

  it("3. autocomplete appears for '/reuse'", () => {
    render(
      <ReuseSlashCommand
        composerInput="/reuse"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();
  });

  it("4. autocomplete does NOT appear for plain text 'hi'", () => {
    render(
      <ReuseSlashCommand
        composerInput="hi"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.queryByTestId("reuse-slash-autocomplete")).toBeNull();
  });

  it("5. autocomplete does NOT appear for mid-message slash 'Use this plan /reuse'", () => {
    render(
      <ReuseSlashCommand
        composerInput="Use this plan /reuse"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.queryByTestId("reuse-slash-autocomplete")).toBeNull();
  });

  it("6. autocomplete does NOT appear for '/reuse hi' (post-prefix characters)", () => {
    render(
      <ReuseSlashCommand
        composerInput="/reuse hi"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    expect(screen.queryByTestId("reuse-slash-autocomplete")).toBeNull();
  });

  it("7. clicking the autocomplete entry clears composer and opens picker", () => {
    const setComposerInput = vi.fn();
    render(
      <ReuseSlashCommand
        composerInput="/r"
        setComposerInput={setComposerInput}
        textareaRef={{ current: null }}
        tripId="t"
        agencyId="a"
        targetItineraryId="i"
        currentVersion={1}
        onSystemVisibleMessage={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));
    expect(setComposerInput).toHaveBeenCalledWith("");
    expect(screen.getByTestId("mock-picker")).toBeInTheDocument();
  });

  it("8. successful confirm posts a SYSTEM_VISIBLE recap", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          itinerary: { id: "itin-1", days: [{ dayNumber: 1 }, { dayNumber: 2 }] },
          sourceTripTitle: "Tokyo Spring 2025",
          sourceDayNumber: 3,
          itemCount: 4,
          newDayNumber: 2,
        }),
    });

    const setComposerInput = vi.fn();
    render(
      <ReuseSlashCommand
        composerInput="/reuse"
        setComposerInput={setComposerInput}
        textareaRef={{ current: null }}
        tripId="trip-1"
        agencyId="agency-1"
        targetItineraryId="itin-1"
        currentVersion={3}
        targetItinerary={{ id: "itin-1", days: [{ dayNumber: 1, items: [] }] }}
        onSystemVisibleMessage={onSystemVisibleMessage}
      />
    );

    // Open picker
    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));
    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm"));
    });

    await waitFor(() => {
      expect(onSystemVisibleMessage).toHaveBeenCalledTimes(1);
    });
    const message = onSystemVisibleMessage.mock.calls[0][0];
    expect(message.role).toBe("SYSTEM_VISIBLE");
    expect(message.content).toContain("Tokyo Spring 2025");
    expect(message.metadata?.kind).toBe("reuse_inserted");

    // Verify the request URL + body shape
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toContain("/trips/trip-1/itinerary/insert-from-rated");
    const body = JSON.parse(init.body);
    expect(body.sourceTripId).toBe("src-trip-1");
    expect(body.ifMatchVersion).toBe(3);
    expect(body.target.itineraryId).toBe("itin-1");
  });

  it("9. error path (410) posts a SYSTEM_VISIBLE error recap", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      status: 410,
      json: () => Promise.resolve({ error: "source_deleted" }),
    });

    render(
      <ReuseSlashCommand
        composerInput="/reuse"
        setComposerInput={vi.fn()}
        textareaRef={{ current: null }}
        tripId="trip-1"
        agencyId="agency-1"
        targetItineraryId="itin-1"
        currentVersion={3}
        targetItinerary={{ id: "itin-1", days: [] }}
        onSystemVisibleMessage={onSystemVisibleMessage}
      />
    );

    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm"));
    });

    await waitFor(() => {
      expect(onSystemVisibleMessage).toHaveBeenCalledTimes(1);
    });
    const message = onSystemVisibleMessage.mock.calls[0][0];
    expect(message.role).toBe("SYSTEM_VISIBLE");
    expect(message.content).toContain("Couldn't add items");
    expect(message.metadata?.kind).toBe("reuse_error");
    expect(message.metadata?.httpStatus).toBe(410);
  });
});
