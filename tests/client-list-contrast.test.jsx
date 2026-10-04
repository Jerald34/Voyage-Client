import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({
  SearchIcon: () => null,
  TrashIcon: () => null,
  UsersIcon: () => null,
}));

import ClientList from "../app/components/trip-dashboard/pages/ClientList.jsx";

const clients = [
  { id: "c1", name: "Elen Cruz", trips: [{ id: "t1" }] },
  { id: "c2", name: "Tenz Reyes", trips: [] },
];

function renderList() {
  return render(
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
}

const WHITE_TEXT = /(^|\s)(hover:)?text-white(\/\d+)?(\s|$)/;
const LIGHT_TERRACOTTA_TEXT = /(^|\s)text-secondary(\/\d+)?(\s|$)/;

describe("ClientList contrast", () => {
  it("draws the selected client's initials in the paired text colour on the strong terracotta", () => {
    renderList();
    const avatar = screen.getByText("EC");
    expect(avatar.className).toContain("bg-secondary-strong");
    expect(avatar.className).toContain("text-on-secondary-strong");
    expect(avatar.className).not.toMatch(WHITE_TEXT);
  });

  it("draws other clients' initials in the body colour on a light tint", () => {
    renderList();
    const avatar = screen.getByText("TR");
    expect(avatar.className).toContain("bg-secondary/15");
    expect(avatar.className).toContain("text-text-primary");
    expect(avatar.className).not.toMatch(WHITE_TEXT);
  });

  it("keeps the selected client's name in the body colour", () => {
    renderList();
    const name = screen.getByText("Elen Cruz");
    expect(name.className).toContain("text-text-primary");
    expect(name.className).toContain("font-black");
    expect(name.className).not.toMatch(LIGHT_TERRACOTTA_TEXT);
  });

  it("gives every delete button a visible icon colour and a themed danger hover", () => {
    renderList();
    const buttons = screen.getAllByTitle("Delete client record");
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.className).toContain("text-text-muted");
      expect(button.className).toContain("hover:text-status-danger");
      expect(button.className).toContain("hover:bg-status-danger/10");
      expect(button.className).not.toMatch(WHITE_TEXT);
      expect(button.className).not.toMatch(/#(fef2f2|dc2626)/);
    }
  });
});
