import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => ({ SearchIcon: () => null, TrashIcon: () => null, UsersIcon: () => null }));

import ClientList from "../app/components/trip-dashboard/pages/ClientList.jsx";

describe("ClientList", () => {
  it("counts saved itineraries in the singular and the plural", () => {
    const clients = [
      { id: "c1", name: "Elen Cruz", trips: [{ id: "t1" }] },
      { id: "c2", name: "Leo Tan", trips: [{ id: "t2" }, { id: "t3" }] },
    ];
    render(
      <ClientList
        clients={clients}
        filteredClients={clients}
        searchQuery=""
        setSearchQuery={() => {}}
        selectedClientId="c1"
        onSelectClient={() => {}}
        onRequestDeleteClient={() => {}}
      />,
    );

    expect(screen.getByText("1 saved itinerary")).toBeInTheDocument();
    expect(screen.getByText("2 saved itineraries")).toBeInTheDocument();
  });

  describe("delete client confirm", () => {
    const clients = [
      { id: "c1", name: "Elen Cruz", trips: [{ id: "t1" }] },
      { id: "c2", name: "Leo Tan", trips: [{ id: "t2" }, { id: "t3" }] },
    ];

    function renderList(onRequestDeleteClient = () => {}) {
      return render(
        <ClientList
          clients={clients}
          filteredClients={clients}
          searchQuery=""
          setSearchQuery={() => {}}
          selectedClientId="c1"
          onSelectClient={() => {}}
          onRequestDeleteClient={onRequestDeleteClient}
        />,
      );
    }

    it("says nothing about deletion until a client's trash button is pressed", () => {
      renderList();
      expect(screen.queryByText(/Deletes all of/)).not.toBeInTheDocument();
    });

    it("names the client and everything their delete removes, and the Delete button is described by that line", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[1]);

      const note = screen.getByText("Deletes all of Leo Tan's trips, chats, share links and ratings.");
      // Only the open row shows a line; the other client is not mentioned.
      expect(screen.queryByText(/Elen Cruz's trips/)).not.toBeInTheDocument();

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      expect(note.id).toBeTruthy();
      expect(deleteButton).toHaveAttribute("aria-describedby", note.id);
      expect(deleteButton).toHaveAccessibleDescription("Deletes all of Leo Tan's trips, chats, share links and ratings.");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("puts the line on its own full-width row in a readable grey, wrapping long names", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[0]);

      const note = screen.getByText(/Deletes all of Elen Cruz's/);
      expect(note.className).toContain("basis-full");
      expect(note.className).toContain("text-text-muted");
      expect(note.className).not.toContain("text-text-soft");
      expect(note.className).toContain("break-words");
      // The row wraps only while confirming, so the line drops under the name and buttons.
      expect(note.parentElement.className).toContain("flex-wrap");
    });

    it("removes the line again on Cancel and leaves other rows unwrapped", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[0]);
      expect(screen.getByText(/Deletes all of/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText(/Deletes all of/)).not.toBeInTheDocument();
      for (const trash of screen.getAllByTitle("Delete client record")) {
        expect(trash.parentElement.className).not.toContain("flex-wrap");
      }
    });

    it("still deletes the client when Delete is pressed", async () => {
      const onRequestDeleteClient = vi.fn().mockResolvedValue(undefined);
      renderList(onRequestDeleteClient);
      fireEvent.click(screen.getAllByTitle("Delete client record")[1]);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(onRequestDeleteClient).toHaveBeenCalledWith(clients[1]);
      await screen.findAllByTitle("Delete client record");
    });
  });
});
