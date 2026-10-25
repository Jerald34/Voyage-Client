import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchPublicItinerary: vi.fn(),
  listPublicComments: vi.fn(async () => ({ comments: [] })),
  postPublicComment: vi.fn(),
  fetchSharedItineraryWeather: vi.fn(async () => ({ weather: { provider: null, attribution: null, days: [] } })),
}));

vi.mock("../app/lib/api/index.js", () => api);
// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  return {
    PlaneIcon: Icon, HotelIcon: Icon, ForkKnifeIcon: Icon, CarIcon: Icon, MapPinIcon: Icon, ChatIcon: Icon,
    UserIcon: Icon, CheckIcon: Icon, CalendarIcon: Icon, UsersIcon: Icon, ListIcon: Icon, MapIcon: Icon, CloseIcon: Icon,
  };
});
vi.mock("../app/components/theme/ThemeToggle", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ useParams: () => ({ token: "share-token-12" }) }));
vi.mock("next/dynamic", () => ({ default: () => function DynamicStub() { return null; } }));
vi.mock("../app/itinerary/view/[token]/components/ProposalRating.jsx", () => ({ default: () => null }));
vi.mock("../app/lib/pdfExport.js", () => ({
  generateItineraryPdf: vi.fn(async () => ({ output: () => new Blob([]) })),
  titleToFilename: vi.fn((s) => s),
}));

import PublicItineraryPage from "../app/itinerary/view/[token]/page.jsx";

function payload(brand = { type: "agency", name: "Lakbay Travel", logoUrl: null }) {
  return {
    share: { clientName: "Garcia" },
    brand,
    trip: { title: "Baguio Weekend", clientName: "Garcia", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Baguio City" },
    itinerary: {
      title: "Baguio Weekend",
      summary: null,
      version: 1,
      days: [{ id: "day-1", dayNumber: 1, date: null, title: "Arrival", summary: null, items: [] }],
    },
    revision: "rev-1",
  };
}

async function renderLoaded() {
  render(<PublicItineraryPage />);
  await screen.findByRole("heading", { level: 1, name: "Baguio Weekend" });
}

const welcome = () => screen.queryByRole("dialog", { name: "Welcome to your trip" });

// The dialog is ready (focus moved in, keys listened for) once its name field has focus.
async function welcomeReady() {
  const dialog = await screen.findByRole("dialog", { name: "Welcome to your trip" });
  await waitFor(() => expect(within(dialog).getByLabelText("Your name")).toHaveFocus());
  return dialog;
}

beforeEach(() => {
  localStorage.clear();
  api.postPublicComment.mockReset();
  api.fetchPublicItinerary.mockResolvedValue(payload());
});

describe("share page welcome", () => {
  it("greets a first-time visitor on behalf of the agency and starts on the name field", async () => {
    await renderLoaded();
    const dialog = await welcomeReady();
    expect(dialog).not.toBeNull();
    expect(within(dialog).getByText(/Lakbay Travel shared this itinerary with you/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Your name")).toHaveFocus();
    expect(within(dialog).getByLabelText(/Email \(optional\)/)).toBeInTheDocument();
  });

  it("names the person for a personal share", async () => {
    api.fetchPublicItinerary.mockResolvedValue(payload({ type: "personal", displayName: "Alice" }));
    await renderLoaded();
    expect(within(await welcomeReady()).getByText(/Alice shared this itinerary with you/)).toBeInTheDocument();
  });

  it("Continue saves the name and email, and comment forms then skip straight to the comment", async () => {
    await renderLoaded();
    const dialog = await welcomeReady();
    fireEvent.change(within(dialog).getByLabelText("Your name"), { target: { value: " Jhoy " } });
    fireEvent.change(within(dialog).getByLabelText(/Email \(optional\)/), { target: { value: "jhoy@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

    expect(welcome()).toBeNull();
    expect(localStorage.getItem("voyage_commenter_name")).toBe("Jhoy");
    expect(localStorage.getItem("voyage_commenter_email")).toBe("jhoy@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Comment on Day 1" }));
    const form = screen.getByRole("form", { name: "Comment on Day 1" });
    expect(within(form).queryByLabelText("Your name")).toBeNull();
    expect(within(form).getByText(/Commenting as/)).toHaveTextContent("Commenting as Jhoy");
  });

  it("Continue with no name explains instead of closing", async () => {
    await renderLoaded();
    const dialog = await welcomeReady();
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(welcome()).not.toBeNull();
    expect(within(dialog).getByText("Please enter your name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Your name")).toHaveFocus();
  });

  it("Just view the trip closes it, and the first comment form asks for the name instead", async () => {
    await renderLoaded();
    fireEvent.click(within(await welcomeReady()).getByRole("button", { name: "Just view the trip" }));
    expect(welcome()).toBeNull();
    expect(localStorage.getItem("voyage_commenter_name")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Comment on Day 1" }));
    const form = screen.getByRole("form", { name: "Comment on Day 1" });
    expect(within(form).getByLabelText("Your name")).toBeInTheDocument();
  });

  it("Escape works like Just view the trip", async () => {
    await renderLoaded();
    await welcomeReady();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(welcome()).toBeNull();
  });

  it("does not greet again on this link after being skipped", async () => {
    const first = render(<PublicItineraryPage />);
    await screen.findByRole("heading", { level: 1, name: "Baguio Weekend" });
    fireEvent.click(within(await welcomeReady()).getByRole("button", { name: "Just view the trip" }));
    first.unmount();

    await renderLoaded();
    expect(welcome()).toBeNull();
  });

  it("never shows for someone whose name is already saved", async () => {
    localStorage.setItem("voyage_commenter_name", "Tester");
    await renderLoaded();
    expect(welcome()).toBeNull();
  });
});
