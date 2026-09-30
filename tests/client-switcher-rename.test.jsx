import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClientSwitcher from "../app/components/trip-dashboard/command-center/ClientSwitcher.jsx";

describe("ClientSwitcher rename", () => {
  it("submits the new title on Enter and closes the editor", () => {
    const onRenameThread = vi.fn();
    render(
      <ClientSwitcher
        isClientMenuOpen
        setIsClientMenuOpen={() => {}}
        clientMenuRef={{ current: null }}
        hasOptions
        activeTripClientName="Alice"
        activeTripInitials="A"
        activeTripOrganizerInitials=""
        clientMenuEmptyTitle=""
        clientMenuEmptyBody=""
        safeOptions={[
          { type: "trip", id: "t1", clientName: "Alice", label: "Alice", destination: "Tokyo", threadId: "thr-1" }
        ]}
        activeOption={{ type: "trip", id: "t1" }}
        getInitials={(s) => s?.[0] ?? ""}
        onRenameThread={onRenameThread}
        onPlanningOptionChange={() => {}}
        deletingThreadId={null}
      />
    );

    fireEvent.click(screen.getByLabelText(/rename Alice/i));
    const input = screen.getByDisplayValue("Alice");
    fireEvent.change(input, { target: { value: "Alice & Bob" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameThread).toHaveBeenCalledWith("thr-1", "Alice & Bob");
  });
});
