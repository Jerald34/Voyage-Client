import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    // Elen has one saved itinerary and Leo two, so the line is checked in the singular and the plural.
    const ELEN_NOTE =
      "Deletes Elen Cruz's 1 saved itinerary and their chats, share links, comments and ratings. This can't be undone.";
    const LEO_NOTE =
      "Deletes Leo Tan's 2 saved itineraries and their chats, share links, comments and ratings. This can't be undone.";
    // Each row's own "N saved itineraries" label stays on screen, so match the confirm line by its tail.
    const ANY_NOTE = /their chats, share links, comments and ratings/;

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
      expect(screen.queryByText(ANY_NOTE)).not.toBeInTheDocument();
    });

    it("names the client, counts their saved itineraries in the plural, and describes the Delete button with that line", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[1]);

      const note = screen.getByText(LEO_NOTE);
      // Only the open row shows a line; the other client is not mentioned.
      expect(screen.queryByText(/Deletes Elen Cruz/)).not.toBeInTheDocument();

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      expect(note.id).toBeTruthy();
      expect(deleteButton).toHaveAttribute("aria-describedby", note.id);
      expect(deleteButton).toHaveAccessibleDescription(LEO_NOTE);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("counts a single saved itinerary in the singular", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[0]);

      expect(screen.getByText(ELEN_NOTE)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete" })).toHaveAccessibleDescription(ELEN_NOTE);
    });

    it("puts the line on its own full-width row in a readable grey, wrapping long names", () => {
      renderList();
      fireEvent.click(screen.getAllByTitle("Delete client record")[0]);

      const note = screen.getByText(ELEN_NOTE);
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
      expect(screen.getByText(ANY_NOTE)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText(ANY_NOTE)).not.toBeInTheDocument();
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
      // The confirm closes once the delete resolves: the line and the Delete button go, the trash buttons return.
      await waitFor(() => expect(screen.queryByText(ANY_NOTE)).not.toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
      expect(screen.getAllByTitle("Delete client record")).toHaveLength(2);
    });
  });
});
