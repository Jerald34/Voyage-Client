import { createRef } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccountMenu from "../app/components/trip-dashboard/layout/AccountMenu.jsx";
import DashboardHeader, { headerVariantForTab } from "../app/components/trip-dashboard/layout/DashboardHeader.jsx";
import DashboardSidebar, { NAV_DRAWER_ID } from "../app/components/trip-dashboard/layout/DashboardSidebar.jsx";
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

  it("shows a badge next to the icon and announces it in the accessible name", () => {
    render(<RailButton label="Admin" icon={<svg />} badge="3" onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "Admin, 3 pending" });
    expect(button).toHaveTextContent("3");
  });

  it("is named by its label alone when there is no badge", () => {
    render(<RailButton label="Admin" icon={<svg />} onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  it("uses a higher-contrast active state in the phone drawer", () => {
    render(<RailButton label="Dashboard" icon={<svg />} active onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveClass(
      "max-[900px]:bg-secondary-strong",
      "max-[900px]:text-on-secondary-strong",
    );
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
    openMenu();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("maria@example.test")).toBeInTheDocument();
    expect(screen.getByText("Owner · Sunline Travel")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the identity outside the menu and describes the menu with it", () => {
    renderMenu();
    const menu = openMenu();
    expect(menu).not.toContainElement(screen.getByText("Maria Santos"));
    expect(menu).toHaveAccessibleDescription(/Maria Santos/);
    expect(menu).toHaveAccessibleDescription(/Owner · Sunline Travel/);
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
  });

  it("stays open when you click the identity block", () => {
    renderMenu();
    openMenu();
    fireEvent.mouseDown(screen.getByText("Maria Santos"));
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
  });

  it("opens account settings", () => {
    const { onOpenSettings } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Account settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
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
    expect(screen.getByRole("button", { name: "Admin, 99+ pending" })).toHaveTextContent("99+");
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
    expect(screen.getByText("Owner · Sunline Travel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("offers a theme switch", () => {
    renderRail();
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });
});

describe("DashboardHeader", () => {
  it("sets no z-index, so modals and slide-overs paint above it", () => {
    render(<DashboardHeader variant="compact" isSidebarOpen={false} setIsSidebarOpen={() => {}} />);
    expect(screen.getByRole("banner").className).not.toMatch(/(^|\s)z-/);
  });

  it.each([false, true])("exposes the drawer state on the menu button (open: %s)", (isSidebarOpen) => {
    render(<DashboardHeader variant="compact" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", String(isSidebarOpen));
    expect(toggle).toHaveAttribute("aria-controls", NAV_DRAWER_ID);
  });

  it('gives the flex Save button a single label child, so "Save to Client" keeps its space', () => {
    render(
      <DashboardHeader
        variant="full"
        activeTab="command-center"
        isSidebarOpen={false}
        setIsSidebarOpen={() => {}}
        isClientMenuOpen={false}
        setIsClientMenuOpen={() => {}}
        clientMenuRef={{ current: null }}
        safeOptions={[]}
        getInitials={() => ""}
        canApproveDraft
        onApproveDraft={() => {}}
      />,
    );

    const save = screen.getByRole("button", { name: "Save to Client" });
    // A bare "Save" text node beside a <span> makes two flex items, and a flex
    // item drops its leading space, which rendered "Saveto Client".
    expect(save.childNodes).toHaveLength(1);
    expect(save.firstChild.textContent).toBe("Save to Client");
  });

  it.each([
    ["dashboard", "compact"],
    ["itineraries", "compact"],
    ["command-center", "full"],
    ["settings", "full"],
    ["admin", "full"],
  ])("gives the %s tab the %s bar", (tab, variant) => {
    expect(headerVariantForTab(tab)).toBe(variant);
  });

  it("keeps only the phone menu button and the logo in the compact bar, and hides it on desktop", () => {
    render(<DashboardHeader variant="compact" isSidebarOpen={false} setIsSidebarOpen={() => {}} liveStatus="Ready" />);

    expect(screen.getByRole("banner").className).toContain("min-[900px]:hidden");
    expect(screen.getByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Voyage" })).toBeInTheDocument();
    expect(screen.queryByText("Ready")).toBeNull();
  });
});

describe("phone drawer", () => {
  const originalMatchMedia = window.matchMedia;

  function setViewport(isPhone) {
    window.matchMedia = (query) => ({
      matches: isPhone,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function renderDrawer({ isSidebarOpen }) {
    const menuButtonRef = createRef();
    const setIsSidebarOpen = vi.fn();
    const utils = render(
      <>
        <button ref={menuButtonRef} type="button">
          Menu
        </button>
        <DashboardSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          menuButtonRef={menuButtonRef}
          setActiveTab={vi.fn()}
          logout={vi.fn()}
          activeTab="dashboard"
          user={agencyOwner}
          agencyId="agency-1"
          pendingCount={0}
        />
      </>,
    );
    return { ...utils, menuButtonRef, setIsSidebarOpen, drawer: utils.container.querySelector("aside") };
  }

  it("is the element the menu button controls", () => {
    setViewport(true);
    expect(renderDrawer({ isSidebarOpen: false }).drawer).toHaveAttribute("id", NAV_DRAWER_ID);
  });

  it("is inert while closed, so its buttons leave the tab order", () => {
    setViewport(true);
    expect(renderDrawer({ isSidebarOpen: false }).drawer).toHaveAttribute("inert");
  });

  it("is interactive while open", () => {
    setViewport(true);
    expect(renderDrawer({ isSidebarOpen: true }).drawer).not.toHaveAttribute("inert");
  });

  it("is never inert on desktop, where the rail is always visible", () => {
    setViewport(false);
    expect(renderDrawer({ isSidebarOpen: false }).drawer).not.toHaveAttribute("inert");
  });

  it("closes on Escape and returns focus to the menu button", () => {
    setViewport(true);
    const { setIsSidebarOpen, menuButtonRef } = renderDrawer({ isSidebarOpen: true });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(setIsSidebarOpen).toHaveBeenCalledWith(false);
    expect(menuButtonRef.current).toHaveFocus();
  });

  it("ignores Escape while closed or on desktop", () => {
    setViewport(true);
    const closed = renderDrawer({ isSidebarOpen: false });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(closed.setIsSidebarOpen).not.toHaveBeenCalled();
    closed.unmount();

    setViewport(false);
    const desktop = renderDrawer({ isSidebarOpen: true });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(desktop.setIsSidebarOpen).not.toHaveBeenCalled();
  });
});
