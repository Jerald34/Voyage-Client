"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import prototypeData from "./data/prototype/trip-dashboard.js";
import { usePrototypeState } from "./hooks/usePrototypeState.js";
import { useTripDashboard } from "./hooks/useTripDashboard.js";
import { useAuth } from "./hooks/useAuth.js";
import { fetchApi } from "./lib/api/index.js";
import { resolveInitialView } from "./lib/deepLinks.js";
import useAgencyStatusPolling from "./hooks/useAgencyStatusPolling.js";

import LandingPage from "./components/landing/LandingPage.jsx";
import HomePage from "./components/trip-dashboard/HomePage.jsx";
import AgentKickoffScreen from "./components/agent/AgentKickoffScreen.jsx";
import WorkspaceScreen from "./components/workspace/WorkspaceScreen.jsx";
import ReviewScreen from "./components/review/ReviewScreen.jsx";
import ShareScreen from "./components/share/ShareScreen.jsx";
import AgencyStatusScreen from "./components/agency-status/AgencyStatusScreen.jsx";

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const authenticatedParam = searchParams.get("authenticated");
  // `tab=team` links: invite acceptance lands on the Dashboard with a welcome
  // notice; other team links open Settings at the Team panel.
  const { initialTab, showJoinedNotice, settingsSection } = resolveInitialView(searchParams);
  const [shouldBypassLanding, setShouldBypassLanding] = useState(false);
  const [user, setUser] = useState(null);
  const [agencyStatus, setAgencyStatus] = useState(null); // null | { status, name, rejectionReason, suspensionReason }
  const {
    activeScreen,
    setActiveScreen,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    tripBrief,
    days,
    selectedDayId,
    setSelectedDayId,
    selectedPlaceId,
    setSelectedPlaceId,
    agentMessages,
    setDays,
  } = usePrototypeState();
  const mapPlaces = Array.isArray(prototypeData.mapPlaces) ? prototypeData.mapPlaces : [];
  const dashboard = useTripDashboard({
    days,
    setDays,
    tripBrief,
    mapPlaces,
  });

  // The session is no longer accepted: drop the cached identity and go to sign-in.
  const handleSessionEnded = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem("voyage-user");
    setUser(null);
    router.push("/login");
  }, [router]);

  // Store a freshly read user and route it: used by the first /auth/me read and by
  // the pending-screen polling, so both react the same way to every account state.
  const applyAuthUser = useCallback((authUser) => {
    localStorage.setItem("voyage-user", JSON.stringify(authUser));
    setUser(authUser);

    const accountType = authUser?.accountType;

    // PENDING — user hasn't chosen account type yet (e.g. OAuth user, or
    // closed the tab mid-signup). Send them to the type picker.
    // Use ?step=type so login/page.jsx can distinguish a fresh server-confirmed
    // PENDING redirect from a stale localStorage entry.
    if (accountType === "PENDING") {
      router.push("/login?step=type");
      return;
    }

    // PERSONAL — no agency expected. Stay on the personal dashboard.
    if (accountType === "PERSONAL") {
      setAgencyStatus(null);
      setShouldBypassLanding(true);
      return;
    }

    const hasMembership = Array.isArray(authUser?.memberships) && authUser.memberships.length > 0;
    if (!hasMembership) {
      // Agency user without a membership — finish the agency wizard.
      router.push("/login?step=agency");
      return;
    }

    const agency = authUser.memberships[0].agency;

    if (agency && agency.status !== "VERIFIED") {
      // Agency not yet verified — show status screen
      setAgencyStatus(agency);
      setShouldBypassLanding(true);
      return;
    }

    // Agency is verified — proceed to dashboard
    setAgencyStatus(null);
    setShouldBypassLanding(true);
  }, [router]);

  useEffect(() => {
    if (authenticatedParam !== "1") return;

    let cancelled = false;
    fetchApi("/auth/me")
      .then((data) => {
        if (cancelled) return;
        applyAuthUser(data.user);
      })
      .catch((error) => {
        if (cancelled) return;

        // An authoritative auth failure means the session cookie was not accepted
        // on this request (e.g. an OAuth user whose cross-origin session cookie
        // wasn't sent/stored). This is the case that previously stranded the user
        // on the welcome screen with no error and no recovery path. Surface it by
        // sending them to the sign-in screen instead of silently swallowing it.
        if (error?.status === 401) {
          handleSessionEnded();
          return;
        }

        // Transient failure (network error / 5xx). Don't strand or hard-redirect:
        // fall back to a previously stored user if we have one, otherwise stay put
        // so a flaky request doesn't bounce a legitimately signed-in user.
        const storedUser = typeof window !== "undefined" ? localStorage.getItem("voyage-user") : null;
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setShouldBypassLanding(true);
          } catch {}
        }
      });

    return () => { cancelled = true; };
  }, [authenticatedParam, applyAuthUser, handleSessionEnded]);

  useEffect(() => {
    if (shouldBypassLanding && activeScreen === "landing") {
      setActiveScreen("trip-brief");
    }
  }, [activeScreen, setActiveScreen, shouldBypassLanding]);

  // While the agency waits (or is rejected/suspended), re-read the user so an
  // approval opens the app without a manual refresh. A session that ended or an
  // agency that was removed leaves the screen the same way the first read would.
  useAgencyStatusPolling({
    enabled: Boolean(agencyStatus) && agencyStatus.status !== "VERIFIED",
    onUser: applyAuthUser,
    onUnauthorized: handleSessionEnded,
  });

  // Show agency status screen for non-verified agencies
  if (agencyStatus && agencyStatus.status !== "VERIFIED") {
    return <AgencyStatusScreen agency={agencyStatus} user={user} onLogout={logout} />;
  }

  const currentScreen = activeScreen === "landing" ? "welcome" : activeScreen;
  const currentWorkspaceTab =
    activeWorkspaceTab === "overview" || activeWorkspaceTab === "itinerary" ? "trip" : activeWorkspaceTab;

  const selectedDay = dashboard.days.find((day) => day.id === selectedDayId) || dashboard.days[0] || null;
  const effectiveSelectedDayId = selectedDay?.id ?? null;
  const selectedPlace = mapPlaces.find((place) => place.id === selectedPlaceId) || null;

  if (currentScreen === "trip-brief") {
    return (
      <HomePage
        user={user}
        agencyTrips={[]}
        initialTab={initialTab}
        initialSettingsSection={settingsSection}
        showJoinedNotice={showJoinedNotice}
        onContinue={() => setActiveScreen("agent-kickoff")}
        onOpenTrip={() => {
          setActiveWorkspaceTab("trip");
          setActiveScreen("workspace");
        }}
      />
    );
  }

  if (currentScreen === "welcome") {
    return <LandingPage onLogin={() => router.push("/login")} onStartPlanning={() => router.push("/login?mode=register")} />;
  }

  return (
    <main className="w-full max-w-[1320px] mx-auto px-5 pt-7 pb-[72px] min-h-screen">
      <div className="system-grain" aria-hidden="true" />

      <section className="[animation:fade-in_0.55s_ease]">
        {currentScreen === "agent-kickoff" && (
          <AgentKickoffScreen onOpenWorkspace={() => setActiveScreen("workspace")} tripBrief={tripBrief} />
        )}

        {currentScreen === "workspace" && (
          <WorkspaceScreen
            activeWorkspaceTab={currentWorkspaceTab}
            agentMessages={agentMessages}
            days={dashboard.days}
            mapPlaces={mapPlaces}
            onReviewTrip={() => setActiveScreen("review")}
            onSelectDay={setSelectedDayId}
            onSelectPlace={setSelectedPlaceId}
            onTabChange={(tab) => {
              setActiveWorkspaceTab(tab);
              if (tab === "map") {
                const nextMapPlaceId = mapPlaces[0]?.id ?? null;
                if (nextMapPlaceId === null) {
                  setSelectedPlaceId(null);
                } else if (!selectedPlaceId) {
                  setSelectedPlaceId(nextMapPlaceId);
                }
              }
            }}
            selectedDay={selectedDay}
            selectedDayId={effectiveSelectedDayId}
            selectedPlace={selectedPlace}
            tripBrief={tripBrief}
          />
        )}

        {currentScreen === "review" && (
          <ReviewScreen
            days={dashboard.days}
            onBackToWorkspace={() => setActiveScreen("workspace")}
            onShare={() => setActiveScreen("share")}
            tripBrief={tripBrief}
          />
        )}

        {currentScreen === "share" && <ShareScreen onBackToWorkspace={() => setActiveScreen("workspace")} />}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
