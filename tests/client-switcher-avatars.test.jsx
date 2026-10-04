import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ClientSwitcher from "../app/components/trip-dashboard/command-center/ClientSwitcher.jsx";

function renderSwitcher() {
  return render(
    <ClientSwitcher
      isClientMenuOpen
      setIsClientMenuOpen={() => {}}
      clientMenuRef={{ current: null }}
      hasOptions
      activeTripClientName="Alice Reyes"
      activeTripInitials="AR"
      activeTripOrganizerInitials=""
      clientMenuEmptyTitle=""
      clientMenuEmptyBody=""
      safeOptions={[
        { type: "trip", id: "t1", clientName: "Bea Cruz", label: "Bea Cruz", destination: "Tokyo", threadId: "thr-1" },
      ]}
      activeOption={{ type: "trip", id: "t2" }}
      getInitials={() => "BC"}
      onPlanningOptionChange={() => {}}
      deletingThreadId={null}
    />,
  );
}

describe("ClientSwitcher initials avatars", () => {
  it.each([
    ["the trigger", "AR"],
    ["the menu", "BC"],
  ])("in %s use the theme-aware text colour on the primary fill", (_, initials) => {
    renderSwitcher();
    const avatar = screen.getByText(initials);
    expect(avatar.className).toContain("bg-primary");
    expect(avatar.className).toContain("text-on-primary");
    expect(avatar.className).not.toMatch(/(^|\s)text-white(\s|$)/);
  });
});
