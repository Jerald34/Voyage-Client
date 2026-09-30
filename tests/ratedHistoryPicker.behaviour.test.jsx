/**
 * ratedHistoryPicker.behaviour.test.jsx
 *
 * Behavioural tests for RatedHistoryPicker (Stage 4A).
 * Fills gaps left by the 11 smoke tests:
 *
 *  Filter chip interactions:
 *   1. Destination chip — typing updates chip text; clear via × reverts state
 *   2. "Show all rated" toggle clears the destination filter
 *   3. Duration dropdown — selecting a value updates chip style (active state)
 *   4. Season dropdown — selecting a value reflects the choice
 *
 *  Selection state propagation:
 *   5. Picker passes onSelectionChange through to the list
 *   6. Expanding a second trip resets the selection to {}
 *
 *  Loading / isLoading:
 *   7. No isLoading prop on picker — gap documented (trips=undefined shows empty)
 *
 *  Mobile vs desktop:
 *   8. At 480px-wide viewport the picker renders with mobile drawer layout
 *   9. At 768px-wide viewport the picker renders with side-panel layout
 *
 *  Slash confirm bar:
 *  10. mode="slash" + item selection renders the confirm bar with "Add to this trip"
 *  11. Confirm bar note field forwards comment to onConfirmInsertions
 */

import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ── Mock RatedTripList so we can control its behaviour ────────────────────────
// We expose an `onSelectionChange` spy via a module-level ref the mock can call.
let capturedOnSelectionChange = null;
let capturedOnTripToggle = null;

vi.mock("../app/components/ratedHistory/RatedTripList.jsx", () => ({
  default: ({ trips, onSelectionChange, onTripToggle, expandedTripId }) => {
    capturedOnSelectionChange = onSelectionChange;
    capturedOnTripToggle = onTripToggle;
    return (
      <ul data-testid="rated-trip-list">
        {(trips || []).map((t) => (
          <li
            key={t.tripId}
            data-testid={`trip-row-${t.tripId}`}
            data-expanded={expandedTripId === t.tripId ? "true" : "false"}
          >
            {t.title}
          </li>
        ))}
      </ul>
    );
  },
}));

import RatedHistoryPicker from "../app/components/ratedHistory/RatedHistoryPicker.jsx";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const trips = [
  {
    tripId: "trip-1",
    title: "Tokyo Spring 2025",
    destinationSummary: "Tokyo",
    dayCount: 7,
    startDate: "2025-03-15",
    endDate: "2025-03-21",
    rating: 5,
    ratedAt: "2025-04-01T00:00:00Z",
  },
  {
    tripId: "trip-2",
    title: "Kyoto Fall 2024",
    destinationSummary: "Kyoto",
    dayCount: 5,
    startDate: "2024-10-10",
    endDate: "2024-10-14",
    rating: 4,
    ratedAt: "2024-11-01T00:00:00Z",
  },
];

function renderPicker(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    currentTrip: { destinationSummary: "Tokyo" },
    mode: "editor",
    agencyId: "agency-1",
    trips,
  };
  return render(<RatedHistoryPicker {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RatedHistoryPicker — filter chip interactions", () => {
  beforeEach(() => {
    capturedOnSelectionChange = null;
    capturedOnTripToggle = null;
    vi.clearAllMocks();
  });

  it("1a. destination chip shows the pre-filled value from currentTrip", () => {
    renderPicker({ currentTrip: { destinationSummary: "Paris" } });
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("1b. clicking × on the destination chip reverts to '+ Add destination' state", () => {
    renderPicker({ currentTrip: { destinationSummary: "Tokyo" } });

    // The chip is filled — should have a clear button
    const clearBtn = screen.getByRole("button", { name: "Clear destination filter" });
    fireEvent.click(clearBtn);

    // After clearing, the "+ Add destination" pill should appear
    expect(screen.getByRole("button", { name: "Add destination filter" })).toBeInTheDocument();
    // The destination value text should be gone
    expect(screen.queryByText("Tokyo")).not.toBeInTheDocument();
  });

  it("2. 'Show all rated' toggle clears the destination filter", () => {
    renderPicker({ currentTrip: { destinationSummary: "Tokyo" } });

    // "Show all rated" button is only visible when destination chip is filled
    const showAllBtn = screen.getByRole("button", { name: "Show all rated" });
    fireEvent.click(showAllBtn);

    // After clicking, destination chip should be empty and "+ Add destination" pill appears
    expect(screen.getByRole("button", { name: "Add destination filter" })).toBeInTheDocument();
    expect(screen.queryByText("Show all rated")).not.toBeInTheDocument();
  });

  it("3. selecting a duration value makes the select reflect the choice", () => {
    renderPicker();
    const durationSelect = screen.getByRole("combobox", { name: /duration/i });

    fireEvent.change(durationSelect, { target: { value: "7" } });

    expect(durationSelect.value).toBe("7");
  });

  it("3b. selecting 'Any length' in duration resets to undefined state", () => {
    renderPicker();
    const durationSelect = screen.getByRole("combobox", { name: /duration/i });

    // First select 7 days
    fireEvent.change(durationSelect, { target: { value: "7" } });
    expect(durationSelect.value).toBe("7");

    // Then reset to "Any length" (value = "")
    fireEvent.change(durationSelect, { target: { value: "" } });
    expect(durationSelect.value).toBe("");
  });

  it("4. selecting a season value is reflected in the dropdown", () => {
    renderPicker();
    const seasonSelect = screen.getByRole("combobox", { name: /season/i });

    fireEvent.change(seasonSelect, { target: { value: "spring" } });

    expect(seasonSelect.value).toBe("spring");
  });

  it("4b. all four seasons are available in the season dropdown", () => {
    renderPicker();
    const seasonSelect = screen.getByRole("combobox", { name: /season/i });
    const options = Array.from(seasonSelect.querySelectorAll("option")).map((o) => o.value);

    expect(options).toContain("spring");
    expect(options).toContain("summer");
    expect(options).toContain("fall");
    expect(options).toContain("winter");
  });

  it("1c. clicking '+ Add destination' expands an input for typing", () => {
    // Start with no destination so we see the "+ Add destination" state
    renderPicker({ currentTrip: null });

    const addBtn = screen.getByRole("button", { name: "Add destination filter" });
    fireEvent.click(addBtn);

    // Input should now be visible
    const input = screen.getByRole("textbox", { name: /destination/i });
    expect(input).toBeInTheDocument();

    // Type a destination
    fireEvent.change(input, { target: { value: "Bali" } });
    expect(input.value).toBe("Bali");
  });
});

describe("RatedHistoryPicker — selection state propagation", () => {
  beforeEach(() => {
    capturedOnSelectionChange = null;
    capturedOnTripToggle = null;
    vi.clearAllMocks();
  });

  it("5. picker forwards onSelectionChange to the list component", () => {
    renderPicker({ trips });

    // The mock captures the prop — call it with an item selection
    expect(capturedOnSelectionChange).toBeTypeOf("function");
    act(() => {
      capturedOnSelectionChange({ kind: "item", itemIds: ["item-x"] });
    });

    // The picker doesn't re-render externally visible content from selection,
    // but the slash confirm bar appears when mode=slash and selection is set.
    // Verify no error thrown — the function was callable.
  });

  it("6. expanding a second trip resets selection to {} (confirm bar disappears)", () => {
    // Use slash mode so the confirm bar appears on selection
    renderPicker({ mode: "slash", trips });

    // Simulate a selection via the captured callback
    expect(capturedOnSelectionChange).toBeTypeOf("function");
    act(() => {
      capturedOnSelectionChange({ kind: "day", dayIds: ["day-1"] });
    });

    // Confirm bar should appear (mode=slash + selection)
    expect(screen.getByTestId("slash-confirm-bar")).toBeInTheDocument();

    // Now simulate toggling a trip (onTripToggle resets selection in the picker)
    expect(capturedOnTripToggle).toBeTypeOf("function");
    act(() => {
      capturedOnTripToggle("trip-2");
    });

    // Confirm bar should disappear because selection was reset to {}
    expect(screen.queryByTestId("slash-confirm-bar")).not.toBeInTheDocument();
  });
});

describe("RatedHistoryPicker — isLoading prop", () => {
  it("7. isLoading=true renders a loading skeleton (role=status) instead of empty state", () => {
    renderPicker({ trips: undefined, isLoading: true });
    // Loading skeleton must be present
    expect(screen.getByRole("status")).toBeInTheDocument();
    // Empty state must NOT appear while loading
    expect(screen.queryByText("No rated trips yet")).not.toBeInTheDocument();
  });

  it("7b. isLoading=false (default) with no trips shows empty state", () => {
    renderPicker({ trips: undefined });
    expect(screen.getByText("No rated trips yet")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("RatedHistoryPicker — mobile vs desktop layout", () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("8. at 480px viewport, panel has mobile (full-width) classes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 480,
    });
    window.dispatchEvent(new Event("resize"));

    const { container } = renderPicker();
    const dialog = container.querySelector('[role="dialog"]');

    // The picker always renders; the Tailwind classes on the panel include
    // 'w-full' for mobile and 'md:w-[440px]' for desktop.
    // We verify the raw class string includes 'w-full' (mobile default).
    expect(dialog.className).toContain("w-full");
  });

  it("9. at 768px viewport, panel includes the md:w-[440px] desktop class", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });
    window.dispatchEvent(new Event("resize"));

    const { container } = renderPicker();
    const dialog = container.querySelector('[role="dialog"]');

    // The component uses Tailwind responsive classes: 'md:w-[440px]'
    // jsdom doesn't apply media query breakpoints, but the class must be present
    // in the rendered markup so that real browsers pick it up.
    expect(dialog.className).toContain("md:w-[440px]");
  });
});

describe("RatedHistoryPicker — slash confirm bar", () => {
  beforeEach(() => {
    capturedOnSelectionChange = null;
    vi.clearAllMocks();
  });

  it("10. mode=slash + item selection shows 'Add to this trip' confirm bar", () => {
    renderPicker({ mode: "slash", trips });

    // Trigger a selection via the mock — must wrap in act() to flush state
    act(() => {
      capturedOnSelectionChange({ kind: "item", itemIds: ["item-abc"] });
    });

    const confirmBar = screen.getByTestId("slash-confirm-bar");
    expect(confirmBar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to this trip/i })).toBeInTheDocument();
  });

  it("11. confirm bar note field value is forwarded to onConfirmInsertions", () => {
    const onConfirmInsertions = vi.fn();
    renderPicker({ mode: "slash", trips, onConfirmInsertions });

    // Trigger a day selection
    act(() => {
      capturedOnSelectionChange({ kind: "day", dayIds: ["day-5"] });
    });

    // Type into the note field
    const noteInput = screen.getByRole("textbox", { name: /add a note/i });
    fireEvent.change(noteInput, { target: { value: "Arrive before noon" } });

    // Click confirm
    fireEvent.click(screen.getByRole("button", { name: /add to this trip/i }));

    expect(onConfirmInsertions).toHaveBeenCalledOnce();
    const [selectionArg, optsArg] = onConfirmInsertions.mock.calls[0];
    expect(selectionArg).toMatchObject({ kind: "day", dayIds: ["day-5"] });
    expect(optsArg.comment).toBe("Arrive before noon");
  });

  it("11b. confirm also calls onClose (picker closes after confirm)", () => {
    const onClose = vi.fn();
    const onConfirmInsertions = vi.fn();
    renderPicker({ mode: "slash", trips, onClose, onConfirmInsertions });

    act(() => {
      capturedOnSelectionChange({ kind: "segment", dayIds: ["day-1", "day-2"] });
    });
    fireEvent.click(screen.getByRole("button", { name: /add to this trip/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
