import React from "react";
import { useTheme } from "../../theme/ThemeProvider";

export default function DashboardSidebar({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, logout, user, pendingCount, agencyId }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const isAdmin = user?.role === "SUPER_ADMIN";
  const isPersonal = user?.accountType === "PERSONAL";
  const hasAgencyMembership = Array.isArray(user?.memberships)
    && user.memberships.some((m) => m?.status === "ACTIVE" && m?.agencyId);

  const navItemBase = "flex flex-col items-center justify-center py-[18px] px-1 text-[rgba(219,234,236,0.65)] no-underline gap-2.5 text-center bg-transparent border-none cursor-pointer font-[inherit] transition-all duration-200 w-full hover:not-[.active]:text-white hover:not-[.active]:bg-white/5 max-[900px]:flex-row max-[900px]:justify-start max-[900px]:px-4 max-[900px]:py-3 max-[900px]:gap-4 max-[900px]:rounded-xl";
  const navItemActive = "text-white bg-white/10 border-l-[3px] border-secondary max-[900px]:border-l-0 max-[900px]:bg-secondary";

  return (
    <>
      {isSidebarOpen && (
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[4px] z-[45] hidden max-[900px]:block"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`w-[90px] bg-gradient-to-b from-sidebar to-[#1a2e38] flex flex-col flex-shrink-0 shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] transition-transform duration-300 z-50 max-[900px]:absolute max-[900px]:h-full max-[900px]:w-60 max-[900px]:backdrop-blur-[16px] max-[900px]:bg-sidebar/90 ${isSidebarOpen ? "max-[900px]:translate-x-0" : "max-[900px]:-translate-x-full"}`}
        aria-label="Dashboard navigation"
      >
        <nav className="flex flex-col py-[18px] flex-1 gap-2 max-[900px]:py-6 max-[900px]:px-6">
          {hasAgencyMembership && !isPersonal && agencyId && (
            <button
              type="button"
              data-tour-target="dashboard-overview"
              className={`${navItemBase} ${activeTab === "dashboard" ? navItemActive : ""}`}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="inline-flex items-center justify-center relative" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" />
                  <rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" />
                  <rect x="3" y="16" width="7" height="5" />
                </svg>
              </span>
              <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">Dashboard</span>
            </button>
          )}

          <button
            type="button"
            className={`${navItemBase} ${activeTab === "command-center" ? navItemActive : ""}`}
            aria-current={activeTab === "command-center" ? "page" : undefined}
            onClick={() => setActiveTab("command-center")}
          >
            <span className="inline-flex items-center justify-center relative" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">Command Center</span>
          </button>

          <button
            type="button"
            className={`${navItemBase} ${activeTab === "itineraries" ? navItemActive : ""}`}
            aria-current={activeTab === "itineraries" ? "page" : undefined}
            onClick={() => setActiveTab("itineraries")}
          >
            <span className="inline-flex items-center justify-center relative" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">Itineraries</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`${navItemBase} ${activeTab === "admin" ? navItemActive : ""}`}
              aria-current={activeTab === "admin" ? "page" : undefined}
              onClick={() => setActiveTab("admin")}
            >
              <span className="inline-flex items-center justify-center relative" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-pill bg-secondary text-white text-[10px] font-bold leading-[18px] text-center">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">Admin</span>
            </button>
          )}

          <button
            type="button"
            data-tour-target="settings-replay"
            className={`${navItemBase} ${activeTab === "settings" ? navItemActive : ""}`}
            aria-current={activeTab === "settings" ? "page" : undefined}
            onClick={() => setActiveTab("settings")}
          >
            <span className="inline-flex items-center justify-center relative" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">{isPersonal ? "My account" : "Settings"}</span>
          </button>

          <button
            type="button"
            className={`${navItemBase} mt-auto`}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="inline-flex items-center justify-center relative" aria-hidden="true">
              {isDark ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>
            <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">{isDark ? "Light" : "Dark"}</span>
          </button>

          <button
            type="button"
            className={navItemBase}
            onClick={logout}
          >
            <span className="inline-flex items-center justify-center relative" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold leading-tight max-[900px]:text-sm">Logout</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
