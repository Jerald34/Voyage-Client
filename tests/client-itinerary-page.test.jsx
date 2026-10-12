import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ClientItineraryPage from "../app/components/trip-dashboard/pages/ClientItineraryPage.jsx";

const fetchItineraryDraftMock = vi.hoisted(() => vi.fn());

vi.mock("../app/lib/api.js", () => ({
  fetchItineraryDraft: (...args) => fetchItineraryDraftMock(...args),
}));

vi.mock("../app/components/trip-dashboard/itinerary/ItineraryDraftPanel.jsx", () => ({
  default: function MockItineraryDraftPanel({ itinerary, draftVersion, primaryActionLabel, tripSummary }) {
    return (
      <section aria-label="saved itinerary detail">
        <span>{draftVersion}</span>
        <h3>{itinerary?.title ?? "Missing itinerary title"}</h3>
        <p>{tripSummary?.destination ?? "Missing destination"}</p>
        <button type="button">{primaryActionLabel}</button>
      </section>
    );
  },
}));

const savedTrips = [
  {
    id: "trip-santos-olongapo",
    clientName: "Santos Family",
    destination: "Olongapo City",
    travelWindow: "May 12-17, 2026",
    approvalStatus: "Approved",
    status: "active",
    itineraryId: "itinerary-santos-1",
  },
  {
    id: "trip-santos-baguio",
    clientName: "Santos Family",
    destination: "Baguio",
    travelWindow: "June 2-5, 2026",
    approvalStatus: "Saved itinerary",
    status: "active",
    itineraryId: "itinerary-santos-2",
  },
  {
    id: "trip-reyes-cebu",
    clientName: "Reyes Group",
    destination: "Cebu",
    travelWindow: "July 9-13, 2026",
    savedAt: "2026-05-08T00:00:00.000Z",
    status: "active",
    itineraryId: "itinerary-reyes-1",
  },
  {
    id: "trip-dela-cruz-subic",
    clientName: "Dela Cruz Family",
    destination: "Subic Bay",
    travelWindow: "October 4-7, 2026",
    approvalStatus: "Sent to client",
    status: "active",
    itineraryId: "itinerary-dela-cruz-1",
  },
  {
    id: "trip-garcia-coron",
    clientName: "Garcia Group",
    destination: "Coron",
    travelWindow: "November 1-5, 2026",
    approvalStatus: "Pending client approval",
    status: "active",
    isSaved: true,
    itineraryId: "itinerary-garcia-1",
  },
];

const unsavedTrips = [
  {
    id: "trip-pending",
    clientName: "Pending Family",
    destination: "Boracay",
    travelWindow: "August 1-5, 2026",
    approvalStatus: "Awaiting itinerary approval",
    status: "active",
    itineraryId: "itinerary-pending",
  },
  {
    id: "trip-final-confirmation",
    clientName: "Almost Family",
    destination: "Bohol",
    travelWindow: "August 10-13, 2026",
    approvalStatus: "Final confirmation pending",
    status: "active",
    itineraryId: "itinerary-final-confirmation",
  },
  {
    id: "trip-approved-without-itinerary",
    clientName: "No Itinerary Client",
    destination: "Davao",
    travelWindow: "September 1-3, 2026",
    approvalStatus: "Approved",
    status: "active",
  },
  {
    id: "trip-archived",
    clientName: "Archived Client",
    destination: "Cebu",
    travelWindow: "March 1-4, 2026",
    approvalStatus: "Approved",
    status: "archived",
    itineraryId: "itinerary-archived",
  },
];

function mockItineraryFetch() {
  fetchItineraryDraftMock.mockImplementation(async (_agencyId, itineraryId) => ({
    itinerary: {
      id: itineraryId,
      title: `Saved ${itineraryId}`,
      version: itineraryId === "itinerary-santos-2" ? 2 : 1,
      days: [],
    },
  }));
}

describe("ClientItineraryPage saved itinerary portfolio", () => {
  beforeEach(() => {
    fetchItineraryDraftMock.mockReset();
    mockItineraryFetch();
  });

  it("shows only approved or saved trips with itinerary ids", async () => {
    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={[...savedTrips, ...unsavedTrips]} />);

    expect(await screen.findByText("Saved itinerary v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open itinerary" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send to Client" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Santos Family").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 saved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reyes Group").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 saved").length).toBeGreaterThan(0);
    expect(screen.getByText("Dela Cruz Family")).toBeInTheDocument();
    expect(screen.getByText("Garcia Group")).toBeInTheDocument();
    expect(screen.getAllByText("Olongapo City").length).toBeGreaterThan(0);
    expect(screen.getByText("Baguio")).toBeInTheDocument();
    expect(screen.queryByText("Pending Family")).not.toBeInTheDocument();
    expect(screen.queryByText("Almost Family")).not.toBeInTheDocument();
    expect(screen.queryByText("No Itinerary Client")).not.toBeInTheDocument();
    expect(screen.queryByText("Archived Client")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Santos Family/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Olongapo City/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Baguio/i })).toHaveAttribute("aria-pressed", "false");
    expect(fetchItineraryDraftMock).toHaveBeenCalledWith("agency-1", "itinerary-santos-1");

    fireEvent.click(screen.getByRole("button", { name: /Dela Cruz Family/i }));
    expect(screen.getByText("Subic Bay")).toBeInTheDocument();
    expect(screen.getByText("Sent to client")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Garcia Group/i }));
    expect(screen.getByText("Coron")).toBeInTheDocument();
  });

  it("selects a client's first saved itinerary and fetches a different itinerary when clicked", async () => {
    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={savedTrips} />);

    await waitFor(() => {
      expect(fetchItineraryDraftMock).toHaveBeenCalledWith("agency-1", "itinerary-santos-1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Baguio/i }));

    await waitFor(() => {
      expect(fetchItineraryDraftMock).toHaveBeenLastCalledWith("agency-1", "itinerary-santos-2");
    });
    expect(screen.getByRole("button", { name: /Baguio/i })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Saved itinerary v2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saved itinerary-santos-2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reyes Group/i }));

    await waitFor(() => {
      expect(fetchItineraryDraftMock).toHaveBeenLastCalledWith("agency-1", "itinerary-reyes-1");
    });
    expect((await screen.findAllByText("Cebu")).length).toBeGreaterThan(0);
  });

  it("shows the saved-portfolio empty state when there are no saved itineraries", () => {
    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={unsavedTrips} />);

    expect(screen.getByText("Saved itineraries will appear here after approval from the Planner.")).toBeInTheDocument();
    expect(screen.getAllByText("No saved itineraries yet.")).toHaveLength(2);
    expect(fetchItineraryDraftMock).not.toHaveBeenCalled();
  });

  it("shows a sidebar empty result when search hides all saved clients", async () => {
    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={savedTrips} />);

    expect(await screen.findByText("Saved itinerary v1")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search clients..."), {
      target: { value: "No matching client" },
    });

    expect(screen.getByText("No saved clients match your search.")).toBeInTheDocument();
    expect(screen.queryByText("No saved itineraries yet.")).not.toBeInTheDocument();
  });

  it("shows an error without losing selected itinerary context when detail fetch fails", async () => {
    fetchItineraryDraftMock.mockRejectedValue(new Error("Network down"));

    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={savedTrips.slice(0, 1)} />);

    expect(await screen.findByText("Unable to load this saved itinerary.")).toBeInTheDocument();
    expect(screen.getByText("Olongapo City")).toBeInTheDocument();
  });

  it("ignores stale itinerary fetch responses after rapid itinerary selection", async () => {
    let resolveFirst;
    let resolveSecond;
    fetchItineraryDraftMock.mockImplementation((_agencyId, itineraryId) => (
      new Promise((resolve) => {
        if (itineraryId === "itinerary-santos-1") {
          resolveFirst = resolve;
        } else {
          resolveSecond = resolve;
        }
      })
    ));

    render(<ClientItineraryPage agencyId="agency-1" agencyTrips={savedTrips.slice(0, 2)} />);

    await waitFor(() => {
      expect(fetchItineraryDraftMock).toHaveBeenCalledWith("agency-1", "itinerary-santos-1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Baguio/i }));

    await waitFor(() => {
      expect(fetchItineraryDraftMock).toHaveBeenCalledWith("agency-1", "itinerary-santos-2");
    });

    await act(async () => {
      resolveSecond({
        itinerary: {
          id: "itinerary-santos-2",
          title: "Current Baguio itinerary",
          version: 2,
          days: [],
        },
      });
    });

    expect(await screen.findByRole("heading", { name: "Current Baguio itinerary" })).toBeInTheDocument();

    await act(async () => {
      resolveFirst({
        itinerary: {
          id: "itinerary-santos-1",
          title: "Stale Olongapo itinerary",
          version: 1,
          days: [],
        },
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Stale Olongapo itinerary")).not.toBeInTheDocument();
    });
  });
});
