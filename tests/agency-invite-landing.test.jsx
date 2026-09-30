import { Suspense } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AcceptInvitePage from "../app/accept-invite/page.jsx";
import AgencyLayout from "../app/agency/[agencyId]/layout.jsx";
import AgencyAgentPage from "../app/agency/[agencyId]/agent/page.jsx";
import TripListPage from "../app/agency/[agencyId]/trip/page.jsx";
import TripDetailPage from "../app/agency/[agencyId]/trip/[tripId]/page.jsx";
import AgencyTripAgentPage from "../app/agency/[agencyId]/trip/[tripId]/agent/page.jsx";
import TeamRoutePage from "../app/agency/[agencyId]/team/page.jsx";
import TripNotInListEmptyState from "../app/components/agency-status/TripNotInListEmptyState.jsx";
import AgencySettingsPage from "../app/components/settings/AgencySettingsPage.jsx";

const mocks = vi.hoisted(() => ({
  searchInvited: "1",
  searchToken: "invite-token",
  role: "STAFF",
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  redirect: vi.fn(),
  lookupInvitation: vi.fn(async () => ({
    invitation: {
      email: "joiner@example.com",
      emailNormalized: "joiner@example.com",
      agencyName: "Voyage Agency",
      inviterName: "Agency Owner",
      role: "STAFF",
      accountExists: true,
    },
  })),
  acceptInvitation: vi.fn(async () => ({ agencyId: "agency-1" })),
  fetchTeam: vi.fn(async () => ({
    members: [],
    viewerRole: "STAFF",
  })),
  fetchApi: vi.fn(() => new Promise(() => {})),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args) => mocks.redirect(...args),
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
  useSearchParams: () => ({
    get: (key) => {
      if (key === "invited") return mocks.searchInvited;
      if (key === "token") return mocks.searchToken;
      return null;
    },
  }),
}));

vi.mock("../app/hooks/useAgencyRole.js", () => ({
  useAgencyRole: () => mocks.role,
}));

vi.mock("../app/lib/api/index.js", () => ({
  lookupInvitation: (...args) => mocks.lookupInvitation(...args),
  acceptInvitation: (...args) => mocks.acceptInvitation(...args),
  fetchApi: (...args) => mocks.fetchApi(...args),
  fetchTeam: (...args) => mocks.fetchTeam(...args),
  listAgencyInvitations: vi.fn(async () => ({ invitations: [] })),
  revokeAgencyInvitation: vi.fn(),
  updateAgencySettings: vi.fn(),
}));

async function renderAsyncRoute(element) {
  await act(async () => {
    render(<Suspense fallback={<div>Loading</div>}>{element}</Suspense>);
  });
}

describe("accepted invite agency landing", () => {
  beforeEach(() => {
    mocks.searchInvited = "1";
    mocks.searchToken = "invite-token";
    mocks.role = "STAFF";
    mocks.routerPush.mockClear();
    mocks.routerReplace.mockClear();
    mocks.redirect.mockClear();
    mocks.lookupInvitation.mockClear();
    mocks.acceptInvitation.mockClear();
    mocks.fetchTeam.mockClear();
    mocks.fetchApi.mockClear();
  });

  it("uses readable semantic colors in the agency navigation and empty Trips page", async () => {
    await renderAsyncRoute(
      <AgencyLayout params={Promise.resolve({ agencyId: "agency-1" })}>
        <TripListPage params={Promise.resolve({ agencyId: "agency-1" })} />
      </AgencyLayout>,
    );

    const navigation = await screen.findByRole("navigation", { name: "Agency navigation" });
    const tripsLink = screen.getByRole("link", { name: "My Trips" });
    const tripsHeading = screen.getByRole("heading", { name: "Trips" });
    const emptyState = screen.getByText("Your agency trips will appear here.");

    expect(navigation.className).toContain("border-border");
    expect(tripsLink.className).toContain("text-text-muted");
    expect(screen.queryByRole("link", { name: "Agent" })).not.toBeInTheDocument();
    expect(tripsHeading.className).toContain("text-text-primary");
    expect(emptyState.className).toContain("text-text-muted");
  });

  it("forwards a legacy accepted-invite Team URL into the current dashboard Team tab", async () => {
    await renderAsyncRoute(<TeamRoutePage params={Promise.resolve({ agencyId: "agency-1" })} />);

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledWith("/?authenticated=1&tab=team&invited=1");
    });
  });

  it("routes successful invitation acceptance into the current dashboard Team tab", async () => {
    window.localStorage.setItem("voyage-user", JSON.stringify({ email: "joiner@example.com" }));

    render(<AcceptInvitePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Accept and join Voyage Agency" }));

    await waitFor(() => {
      expect(mocks.routerPush).toHaveBeenCalledWith("/?authenticated=1&tab=team&invited=1");
    });
  });

  it("redirects legacy agency Agent URLs into the current dashboard", () => {
    render(<AgencyAgentPage params={Promise.resolve({ agencyId: "agency-1" })} />);

    expect(mocks.redirect).toHaveBeenCalledWith("/?authenticated=1");
  });

  it("redirects legacy trip Agent URLs into the current dashboard", () => {
    render(<AgencyTripAgentPage params={Promise.resolve({ agencyId: "agency-1", tripId: "trip-1" })} />);

    expect(mocks.redirect).toHaveBeenCalledWith("/?authenticated=1");
  });

  it("routes assigned trip details into the current dashboard instead of the legacy Agent URL", async () => {
    mocks.fetchApi.mockResolvedValueOnce({ trip: { id: "trip-1" } });

    await renderAsyncRoute(
      <TripDetailPage params={Promise.resolve({ agencyId: "agency-1", tripId: "trip-1" })} />,
    );

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledWith("/?authenticated=1");
    });
  });

  it("keeps staff trip detail loading and unassigned states readable", async () => {
    await renderAsyncRoute(
      <TripDetailPage params={Promise.resolve({ agencyId: "agency-1", tripId: "trip-1" })} />,
    );

    expect(screen.getByText(/Loading/).className).toContain("text-text-muted");

    render(<TripNotInListEmptyState ownerName="Owner Name" ownerEmail="owner@example.com" />);

    expect(screen.getByText(/This trip isn't on your list/).className).toContain("text-text-muted");
    expect(screen.getByText("Owner Name").className).toContain("text-text-primary");
  });

  it("keeps invited admin settings controls readable", () => {
    mocks.role = "ADMIN";

    render(<AgencySettingsPage agencyId="agency-1" />);

    expect(screen.getByRole("heading", { name: "Agency settings" }).className).toContain("text-text-primary");
    expect(screen.getByText("Workspace").className).toContain("text-text-muted");
    expect(screen.getByPlaceholderText("Your agency name").className).toContain("text-text-primary");
  });
});
