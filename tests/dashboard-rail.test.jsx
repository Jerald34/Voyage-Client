import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountMenu from "../app/components/trip-dashboard/layout/AccountMenu.jsx";
import DashboardSidebar from "../app/components/trip-dashboard/layout/DashboardSidebar.jsx";
import RailButton from "../app/components/trip-dashboard/layout/RailButton.jsx";

function renderMenu(props = {}) {
  const handlers = { onOpenSettings: vi.fn(), onSignOut: vi.fn() };
  render(
    <AccountMenu
      initials="MS"
      displayName="Maria Santos"
      email="maria@example.test"
      role="OWNER"
      agencyName="Sunline Travel"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
  return screen.getByRole("menu", { name: "Account" });
}

describe("RailButton", () => {
  it("is named by its label and marks the current page", () => {
    render(<RailButton label="Dashboard" icon={<svg />} active onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("leaves aria-current off when it is not the current page", () => {
    render(<RailButton label="Settings" icon={<svg />} onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Settings" })).not.toHaveAttribute("aria-current");
  });

  it("shows a badge next to the icon", () => {
    render(<RailButton label="Admin" icon={<svg />} badge="3" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Admin" })).toHaveTextContent("3");
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<RailButton label="Itineraries" icon={<svg />} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Itineraries" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("AccountMenu", () => {
  it("opens with the signed-in identity and focuses the first item", () => {
    renderMenu();
    const menu = openMenu();
    expect(menu).toHaveTextContent("Maria Santos");
    expect(menu).toHaveTextContent("maria@example.test");
    expect(menu).toHaveTextContent("Owner · Sunline Travel");
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("moves between items with the arrow keys", () => {
    renderMenu();
    const menu = openMenu();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the avatar", () => {
    renderMenu();
    fireEvent.keyDown(openMenu(), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
  });

  it("signs out", () => {
    const { onSignOut } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens account settings", () => {
    const { onOpenSettings } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Account settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("closes when you click outside", () => {
    renderMenu();
    openMenu();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens with ArrowDown from the avatar", () => {
    renderMenu();
    fireEvent.keyDown(screen.getByRole("button", { name: "Account menu" }), { key: "ArrowDown" });
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();
  });
});

const agencyOwner = {
  id: "u1",
  displayName: "Maria Santos",
  email: "maria@example.test",
  accountType: "AGENCY_USER",
  role: "USER",
  memberships: [
    { agencyId: "agency-1", role: "OWNER", status: "ACTIVE", agency: { id: "agency-1", name: "Sunline Travel" } },
  ],
};

function renderRail(props = {}) {
  const handlers = { setActiveTab: vi.fn(), setIsSidebarOpen: vi.fn(), logout: vi.fn() };
  const utils = render(
    <DashboardSidebar
      isSidebarOpen={false}
      activeTab="dashboard"
      user={agencyOwner}
      agencyId="agency-1"
      pendingCount={0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...utils };
}

describe("DashboardSidebar rail", () => {
  it("names every destination and marks the current one", () => {
    renderRail();
    for (const name of ["Dashboard", "Command Center", "Itineraries", "Settings"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });

  it("shows the logo with the workspace name", () => {
    renderRail();
    expect(screen.getByRole("img", { name: "Sunline Travel workspace" })).toBeInTheDocument();
  });

  it("switches tabs", () => {
    const { setActiveTab } = renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(setActiveTab).toHaveBeenCalledWith("settings");
  });

  it("keeps the first-use tour targets", () => {
    const { container } = renderRail();
    expect(container.querySelector('[data-tour-target="settings-replay"]')).toHaveAccessibleName("Settings");
    expect(container.querySelector('[data-tour-target="dashboard-overview"]')).toHaveAccessibleName("Dashboard");
  });

  it("shows Admin with its pending count to super admins", () => {
    renderRail({ user: { ...agencyOwner, role: "SUPER_ADMIN" }, pendingCount: 120 });
    expect(screen.getByRole("button", { name: "Admin" })).toHaveTextContent("99+");
  });

  it("calls a personal account's settings My account and has no Dashboard", () => {
    renderRail({ user: { id: "u2", displayName: "Pat", accountType: "PERSONAL", memberships: [] }, agencyId: null });
    expect(screen.queryByRole("button", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My account" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Voyage workspace" })).toBeInTheDocument();
  });

  it("signs out from the account menu", () => {
    const { logout } = renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menu", { name: "Account" })).toHaveTextContent("Owner · Sunline Travel");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("offers a theme switch", () => {
    renderRail();
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });
});
