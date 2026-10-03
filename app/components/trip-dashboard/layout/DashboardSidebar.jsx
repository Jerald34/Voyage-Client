"use client";

import { useTheme } from "../../theme/ThemeProvider";
import { getInitials } from "../../../lib/formatters.js";
import useMobileViewport from "../mobile/useMobileViewport.js";
import AccountMenu from "./AccountMenu.jsx";
import RailButton from "./RailButton.jsx";

function Icon({ children }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </Icon>
  ),
  commandCenter: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  itineraries: (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Icon>
  ),
  admin: (
    <Icon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  ),
  moon: (
    <Icon>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  ),
};

/**
 * App navigation. Desktop: a 72px icon rail inside the glass frame (logo,
 * destinations, theme switch, account menu). Phones (≤900px): the same items
 * in a slide-in glass drawer under the header, with the account inline.
 */
export default function DashboardSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  logout,
  user,
  pendingCount,
  agencyId,
}) {
  const { theme, setTheme } = useTheme();
  const isMobile = useMobileViewport();
  const isDark = theme === "dark";
  const isAdmin = user?.role === "SUPER_ADMIN";
  const isPersonal = user?.accountType === "PERSONAL";
  const memberships = Array.isArray(user?.memberships) ? user.memberships : [];
  const hasAgencyMembership = memberships.some((m) => m?.status === "ACTIVE" && m?.agencyId);
  const membership = memberships.find((m) => m?.agencyId === agencyId) ?? null;
  const workspaceName = (!isPersonal && membership?.agency?.name) || "Voyage";
  const displayName = user?.displayName || "Traveler";

  const items = [
    hasAgencyMembership && !isPersonal && agencyId
      ? { tab: "dashboard", label: "Dashboard", icon: ICONS.dashboard, tourTarget: "dashboard-overview" }
      : null,
    { tab: "command-center", label: "Command Center", icon: ICONS.commandCenter },
    { tab: "itineraries", label: "Itineraries", icon: ICONS.itineraries },
    isAdmin
      ? {
          tab: "admin",
          label: "Admin",
          icon: ICONS.admin,
          badge: pendingCount > 0 ? (pendingCount > 99 ? "99+" : String(pendingCount)) : null,
        }
      : null,
    { tab: "settings", label: isPersonal ? "My account" : "Settings", icon: ICONS.settings, tourTarget: "settings-replay" },
  ].filter(Boolean);

  function go(tab) {
    setActiveTab(tab);
    if (isMobile) setIsSidebarOpen(false);
  }

  return (
    <>
      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-12 z-[45] hidden bg-black/40 backdrop-blur-[4px] max-[900px]:block"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <aside
        aria-label="Dashboard navigation"
        className={[
          "z-50 flex flex-shrink-0 flex-col gap-2",
          "min-[901px]:relative min-[901px]:w-[72px] min-[901px]:items-center min-[901px]:py-4",
          "max-[900px]:frame-panel max-[900px]:fixed max-[900px]:bottom-0 max-[900px]:left-0 max-[900px]:top-12 max-[900px]:w-64 max-[900px]:px-4 max-[900px]:py-5",
          "max-[900px]:transition-transform max-[900px]:duration-300",
          isSidebarOpen ? "max-[900px]:translate-x-0" : "max-[900px]:-translate-x-full",
        ].join(" ")}
      >
        <img
          src="/icon.svg"
          alt={`${workspaceName} workspace`}
          title={workspaceName}
          className="mb-2 h-8 w-8 max-[900px]:hidden"
        />

        <nav aria-label="Main" className="flex flex-col gap-2 min-[901px]:items-center">
          {items.map((item) => (
            <RailButton
              key={item.tab}
              label={item.label}
              icon={item.icon}
              badge={item.badge ?? null}
              tourTarget={item.tourTarget}
              active={activeTab === item.tab}
              onClick={() => go(item.tab)}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 min-[901px]:items-center">
          <RailButton
            label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            icon={isDark ? ICONS.sun : ICONS.moon}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
          {isMobile ? (
            <div className="mt-2 border-t border-[color:var(--frame-border)] pt-3">
              <p className="truncate text-[13px] font-semibold text-text-primary">{displayName}</p>
              {user?.email ? <p className="truncate text-[12px] text-text-muted">{user.email}</p> : null}
              <button
                type="button"
                onClick={logout}
                className="frame-tile mt-3 min-h-11 w-full rounded-xl px-3 text-left text-[13px] font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Sign out
              </button>
            </div>
          ) : (
            <AccountMenu
              initials={getInitials(displayName)}
              displayName={displayName}
              email={user?.email ?? null}
              role={isPersonal ? null : membership?.role ?? null}
              agencyName={isPersonal ? null : membership?.agency?.name ?? null}
              onOpenSettings={() => go("settings")}
              onSignOut={logout}
            />
          )}
        </div>
      </aside>
    </>
  );
}
