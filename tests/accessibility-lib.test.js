import { describe, expect, it } from "vitest";
import {
  formatTravelerNeedsSummary,
  hasTravelerNeeds,
  normalizeTravelerNeeds,
  withTravelerNeeds,
} from "../app/lib/accessibility/travelerNeeds.js";
import {
  formatAccessibilitySummary,
  getAccessibilityBadges,
  describeAccessibilityBadges,
  getAccessibilityPdfText,
  getPrimaryAccessibilityBadge,
  getPlaceAccessibility,
  summarizeAccessibility,
} from "../app/lib/accessibility/placeAccessibility.js";

const checked = (flags = {}) => ({
  metadata: { accessibility: { ...flags, source: "GOOGLE_PLACES", checkedAt: "2026-10-01T00:00:00.000Z" } },
});

describe("traveler needs helpers", () => {
  it("normalizes to canonical order, drops unknown ids and trims notes", () => {
    expect(normalizeTravelerNeeds({ needs: ["SENIOR", "FLYING", "WHEELCHAIR", "SENIOR"], notes: "  Uses a cane  " })).toEqual({
      needs: ["WHEELCHAIR", "SENIOR"],
      notes: "Uses a cane",
    });
    expect(normalizeTravelerNeeds({ needs: [], notes: "   " })).toEqual({ needs: [], notes: null });
    expect(normalizeTravelerNeeds(null)).toBeNull();
    expect(normalizeTravelerNeeds({ needs: [], notes: "x".repeat(600) }).notes).toHaveLength(500);
  });

  it("summarizes needs for labels", () => {
    expect(hasTravelerNeeds({ needs: [], notes: null })).toBe(false);
    expect(formatTravelerNeedsSummary({ needs: ["WHEELCHAIR", "SENIOR"], notes: null })).toBe("Wheelchair user · Senior travelers");
    expect(formatTravelerNeedsSummary({ needs: [], notes: "Uses a cane" })).toBe("Notes added");
  });

  it("sets needs on one thread state and keeps its other fields", () => {
    const states = { a: { threadId: "a", messages: [1] }, b: { threadId: "b" } };

    expect(withTravelerNeeds(states, "a", { needs: ["HEARING"], notes: null })).toEqual({
      a: { threadId: "a", messages: [1], travelerNeeds: { needs: ["HEARING"], notes: null } },
      b: { threadId: "b" },
    });
    expect(withTravelerNeeds({}, "c", null)).toEqual({ c: { travelerNeeds: null } });
  });
});

describe("place accessibility helpers", () => {
  it("returns null for a place that was never checked", () => {
    expect(getPlaceAccessibility({ metadata: {} })).toBeNull();
    expect(getAccessibilityBadges({ metadata: {} })).toEqual([]);
  });

  it("puts a known 'no' entrance first, then known yes flags, up to three", () => {
    expect(getAccessibilityBadges(checked({ wheelchairAccessibleEntrance: false, wheelchairAccessibleRestroom: true }))).toEqual([
      { key: "entrance-no", label: "Entrance not wheelchair accessible", tone: "warning" },
      { key: "wheelchairAccessibleRestroom", label: "Accessible restroom", tone: "positive" },
    ]);
    expect(
      getAccessibilityBadges(
        checked({
          wheelchairAccessibleEntrance: true,
          wheelchairAccessibleRestroom: true,
          wheelchairAccessibleParking: true,
          wheelchairAccessibleSeating: true,
        })
      )
    ).toHaveLength(3);
  });

  it("says 'not verified' when checked but Google had no data", () => {
    expect(getAccessibilityBadges(checked())).toEqual([{ key: "unverified", label: "Accessibility not verified", tone: "neutral" }]);
  });

  it("counts stops and formats the summary", () => {
    const days = [
      {
        items: [
          { placeSnapshot: checked({ wheelchairAccessibleEntrance: true }) },
          { placeSnapshot: checked({ wheelchairAccessibleEntrance: false }) },
          { placeSnapshot: { metadata: {} } },
          { placeSnapshot: null },
        ],
      },
    ];
    const summary = summarizeAccessibility(days);

    expect(summary).toEqual({ total: 3, checked: 2, accessibleEntrance: 1, notAccessible: 1, notVerified: 1 });
    expect(formatAccessibilitySummary(summary)).toBe(
      "1 of 3 stops have a wheelchair-accessible entrance · 1 not accessible · 1 not verified"
    );
  });

  it("builds WinAnsi-safe PDF text", () => {
    expect(getAccessibilityPdfText(checked({ wheelchairAccessibleEntrance: true, wheelchairAccessibleRestroom: true }))).toBe(
      "Accessibility: accessible entrance, accessible restroom"
    );
    expect(getAccessibilityPdfText(checked())).toBe("Accessibility: not verified");
    expect(getAccessibilityPdfText({ metadata: {} })).toBe("");
  });
});

describe("badge helpers for tight or replaced content", () => {
  it("picks the warning badge first, otherwise the first badge, otherwise nothing", () => {
    expect(
      getPrimaryAccessibilityBadge(checked({ wheelchairAccessibleEntrance: false, wheelchairAccessibleRestroom: true }))
    ).toMatchObject({ key: "entrance-no", tone: "warning" });
    expect(
      getPrimaryAccessibilityBadge(checked({ wheelchairAccessibleEntrance: true, wheelchairAccessibleRestroom: true }))
    ).toMatchObject({ key: "wheelchairAccessibleEntrance" });
    expect(getPrimaryAccessibilityBadge({ metadata: {} })).toBeNull();
  });

  it("describes badges as one phrase for an accessible name", () => {
    expect(describeAccessibilityBadges([{ label: "Accessible entrance" }, { label: "Accessible restroom" }])).toBe(
      "Accessibility: Accessible entrance, Accessible restroom"
    );
    expect(describeAccessibilityBadges([])).toBe("");
    expect(describeAccessibilityBadges(undefined)).toBe("");
  });
});
