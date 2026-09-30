/**
 * reuseSlashCommand.behaviour.test.jsx
 *
 * Behavioural tests for ReuseSlashCommand (Stage 6C).
 * Fills gaps left by the 9 smoke tests which already cover:
 *   - Autocomplete appears for '/', '/r', '/reuse'
 *   - Autocomplete does NOT appear for plain text, mid-message slash, post-prefix
 *   - Picking 'reuse' clears composer + opens picker
 *   - 200 success → SYSTEM_VISIBLE recap with source trip title
 *   - 410 error → SYSTEM_VISIBLE error recap
 *
 * New tests added here:
 *   1. Tab key on the textarea picks 'reuse' (same as Enter)
 *   2. '/reuse ' (trailing space) → autocomplete CLOSES (regex rejects non-letter)
 *   3. '/REUSE' (uppercase) → autocomplete triggers (regex is case-insensitive)
 *   4. ' /reuse' (leading space) → autocomplete does NOT trigger (not at index 0)
 *   5. Confirm with comment → recap includes "Staff note: ..."
 *   6. Network error (fetch throws) → SYSTEM_VISIBLE error with network_error reason
 *   7. pickerOpen flips to false after successful insertion
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

// Track comment passed to onConfirmInsertions so we can verify it
let confirmCallback = null;

vi.mock(
  "../app/components/ratedHistory/RatedHistoryPicker.jsx",
  () => ({
    default: ({ isOpen, onClose, onConfirmInsertions }) => {
      confirmCallback = onConfirmInsertions;
      return isOpen ? (
        <div data-testid="mock-picker" role="dialog">
          <button
            type="button"
            data-testid="mock-picker-confirm"
            onClick={() =>
              onConfirmInsertions(
                { kind: "day", dayIds: ["day-3"], sourceTripId: "src-trip-1" },
                { comment: "Arrive early" }
              )
            }
          >
            Confirm with note
          </button>
          <button
            type="button"
            data-testid="mock-picker-confirm-no-note"
            onClick={() =>
              onConfirmInsertions(
                { kind: "day", dayIds: ["day-3"], sourceTripId: "src-trip-1" },
                { comment: "" }
              )
            }
          >
            Confirm no note
          </button>
          <button type="button" data-testid="mock-picker-close" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null;
    },
  })
);

import ReuseSlashCommand from "../app/components/ratedHistory/entryPoints/ReuseSlashCommand.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Minimal component wiring that gives us a real textarea ref.
 * We drive composerInput via the parent state so key handlers can trigger.
 */
function HarnessWithTextarea({ composerInputInit = "", onSystemVisibleMessage, onInserted }) {
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
        onSystemVisibleMessage={onSystemVisibleMessage ?? vi.fn()}
        onInserted={onInserted}
      />
    </div>
  );
}

import { useState as useReactState } from "react";

function renderSlash(props = {}) {
  const defaults = {
    composerInput: "/",
    setComposerInput: vi.fn(),
    textareaRef: { current: null },
    tripId: "trip-1",
    agencyId: "agency-1",
    targetItineraryId: "itin-1",
    currentVersion: 3,
    targetItinerary: { id: "itin-1", days: [{ dayNumber: 1, items: [] }] },
    onSystemVisibleMessage: vi.fn(),
  };
  return render(<ReuseSlashCommand {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReuseSlashCommand — autocomplete edge cases", () => {
  beforeEach(() => {
    confirmCallback = null;
    vi.clearAllMocks();
    if (!global.fetch || !global.fetch.mockReset) {
      global.fetch = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Tab key in autocomplete picks 'reuse' (same effect as Enter)", async () => {
    const setComposerInput = vi.fn();
    const textareaRef = { current: null };

    const { container } = render(
      <div style={{ position: "relative" }}>
        <textarea
          data-testid="textarea"
          ref={(el) => { textareaRef.current = el; }}
          defaultValue="/r"
        />
        <ReuseSlashCommand
          composerInput="/r"
          setComposerInput={setComposerInput}
          textareaRef={textareaRef}
          tripId="t"
          agencyId="a"
          targetItineraryId="i"
          currentVersion={1}
          onSystemVisibleMessage={vi.fn()}
        />
      </div>
    );

    // Autocomplete dropdown should be visible
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();

    // Fire Tab on the textarea (capture phase handler)
    const textarea = screen.getByTestId("textarea");
    fireEvent.keyDown(textarea, { key: "Tab" });

    // setComposerInput should have been called with "" (clears the composer)
    expect(setComposerInput).toHaveBeenCalledWith("");
    // Picker should now be open
    expect(screen.getByTestId("mock-picker")).toBeInTheDocument();
  });

  it("2. '/reuse ' (trailing space) does NOT show autocomplete", () => {
    renderSlash({ composerInput: "/reuse " });
    // Regex ^\/[a-z]*$ does not allow trailing space
    expect(screen.queryByTestId("reuse-slash-autocomplete")).toBeNull();
  });

  it("3. '/REUSE' (uppercase) DOES show autocomplete (case-insensitive flag)", () => {
    renderSlash({ composerInput: "/REUSE" });
    // The regex uses the /i flag: /^\/[a-z]*$/i
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();
  });

  it("4. ' /reuse' (leading space) does NOT show autocomplete", () => {
    renderSlash({ composerInput: " /reuse" });
    // ^ anchor means the slash must be at index 0
    expect(screen.queryByTestId("reuse-slash-autocomplete")).toBeNull();
  });

  it("5. confirm with a pending comment includes 'Staff note: ...' in recap content", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          itinerary: { id: "itin-1", days: [{ dayNumber: 3, items: [] }] },
          sourceTripTitle: "Kyoto Fall 2024",
          sourceDayNumber: 2,
          itemCount: 3,
          newDayNumber: 3,
        }),
    });

    renderSlash({
      composerInput: "/reuse",
      onSystemVisibleMessage,
      targetItinerary: { id: "itin-1", days: [{ dayNumber: 1, items: [] }] },
    });

    // Open picker
    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));

    // Click the confirm button that sends comment="Arrive early"
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm"));
    });

    await waitFor(() => {
      expect(onSystemVisibleMessage).toHaveBeenCalledTimes(1);
    });

    const message = onSystemVisibleMessage.mock.calls[0][0];
    expect(message.role).toBe("SYSTEM_VISIBLE");
    expect(message.content).toContain("Kyoto Fall 2024");
    // Staff note should appear in the recap
    expect(message.content).toContain("Staff note: Arrive early");
  });

  it("6. fetch throws (network error) → SYSTEM_VISIBLE recap with error content", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    renderSlash({
      composerInput: "/reuse",
      onSystemVisibleMessage,
      targetItinerary: { id: "itin-1", days: [] },
    });

    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm-no-note"));
    });

    await waitFor(() => {
      expect(onSystemVisibleMessage).toHaveBeenCalledTimes(1);
    });

    const message = onSystemVisibleMessage.mock.calls[0][0];
    expect(message.role).toBe("SYSTEM_VISIBLE");
    // The error path from the catch block posts "Couldn't reach the server."
    expect(message.content).toMatch(/couldn't reach the server/i);
    // metadata kind should be reuse_error
    expect(message.metadata?.kind).toBe("reuse_error");
  });

  it("7. pickerOpen flips to false after successful insertion (picker unmounts)", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          itinerary: { id: "itin-1", days: [] },
          sourceTripTitle: "Tokyo Spring 2025",
        }),
    });

    renderSlash({
      composerInput: "/reuse",
      onSystemVisibleMessage,
      targetItinerary: { id: "itin-1", days: [] },
    });

    // Open picker
    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));
    expect(screen.getByTestId("mock-picker")).toBeInTheDocument();

    // Confirm → successful insert
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm-no-note"));
    });

    await waitFor(() => {
      // After success, setPickerOpen(false) runs → picker unmounts
      expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
    });
  });

  it("7b. after picker closes, Esc on a now-absent picker has no effect (no re-open)", async () => {
    const onSystemVisibleMessage = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ itinerary: { id: "itin-1", days: [] } }),
    });

    renderSlash({
      composerInput: "/reuse",
      onSystemVisibleMessage,
      targetItinerary: { id: "itin-1", days: [] },
    });

    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-picker-confirm-no-note"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
    });

    // Esc should have no effect now (no dialog open, no crash)
    fireEvent.keyDown(document, { key: "Escape" });

    // Picker is still closed — Esc didn't re-open it
    expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
  });
});

// ── Draft-context tests (tripId / targetItineraryId / currentVersion null) ──────

describe("ReuseSlashCommand — draft (no valid target)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!global.fetch || !global.fetch.mockReset) {
      global.fetch = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Helper: render the component in draft mode. */
  function renderDraft(overrides = {}) {
    const defaults = {
      composerInput: "/reuse",
      setComposerInput: vi.fn(),
      textareaRef: { current: null },
      tripId: null,
      agencyId: "agency-1",
      targetItineraryId: null,
      currentVersion: null,
      onSystemVisibleMessage: vi.fn(),
    };
    return render(<ReuseSlashCommand {...defaults} {...overrides} />);
  }

  it("D1. autocomplete dropdown is visible in a draft when composer is '/reuse'", () => {
    renderDraft();
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();
  });

  it("D2. dropdown shows the save-first hint text instead of the normal description", () => {
    renderDraft();
    expect(
      screen.getByText("Save this plan first to reuse from past trips")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Insert items from a rated past trip")
    ).not.toBeInTheDocument();
  });

  it("D3. clicking the autocomplete option calls setComposerInput('') and does NOT open the picker", () => {
    const setComposerInput = vi.fn();
    renderDraft({ setComposerInput });

    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));

    expect(setComposerInput).toHaveBeenCalledWith("");
    expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
  });

  it("D4. Enter keydown on the textarea clears the composer and does NOT open the picker", () => {
    const setComposerInput = vi.fn();
    const textareaRef = { current: null };

    render(
      <div style={{ position: "relative" }}>
        <textarea
          data-testid="textarea"
          ref={(el) => { textareaRef.current = el; }}
          defaultValue="/reuse"
        />
        <ReuseSlashCommand
          composerInput="/reuse"
          setComposerInput={setComposerInput}
          textareaRef={textareaRef}
          tripId={null}
          agencyId="agency-1"
          targetItineraryId={null}
          currentVersion={null}
          onSystemVisibleMessage={vi.fn()}
        />
      </div>
    );

    // Confirm autocomplete is open (so the capture-phase handler is attached)
    expect(screen.getByTestId("reuse-slash-autocomplete")).toBeInTheDocument();

    // Fire Enter — the capture-phase handler must intercept it
    const textarea = screen.getByTestId("textarea");
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(setComposerInput).toHaveBeenCalledWith("");
    expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
  });

  it("D5. Tab keydown on the textarea clears the composer and does NOT open the picker", () => {
    const setComposerInput = vi.fn();
    const textareaRef = { current: null };

    render(
      <div style={{ position: "relative" }}>
        <textarea
          data-testid="textarea"
          ref={(el) => { textareaRef.current = el; }}
          defaultValue="/reuse"
        />
        <ReuseSlashCommand
          composerInput="/reuse"
          setComposerInput={setComposerInput}
          textareaRef={textareaRef}
          tripId={null}
          agencyId="agency-1"
          targetItineraryId={null}
          currentVersion={null}
          onSystemVisibleMessage={vi.fn()}
        />
      </div>
    );

    const textarea = screen.getByTestId("textarea");
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(setComposerInput).toHaveBeenCalledWith("");
    expect(screen.queryByTestId("mock-picker")).not.toBeInTheDocument();
  });

  it("D6. saved-trip path still opens the picker (regression: valid target unchanged)", () => {
    const setComposerInput = vi.fn();
    render(
      <ReuseSlashCommand
        composerInput="/r"
        setComposerInput={setComposerInput}
        textareaRef={{ current: null }}
        tripId="trip-1"
        agencyId="agency-1"
        targetItineraryId="itin-1"
        currentVersion={3}
        onSystemVisibleMessage={vi.fn()}
      />
    );

    // The normal description is shown for a valid target
    expect(
      screen.getByText("Insert items from a rated past trip")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("reuse-slash-option-reuse"));

    expect(setComposerInput).toHaveBeenCalledWith("");
    expect(screen.getByTestId("mock-picker")).toBeInTheDocument();
  });
});
