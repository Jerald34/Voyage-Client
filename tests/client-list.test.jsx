import { render, screen } from "@testing-library/react";
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
});
