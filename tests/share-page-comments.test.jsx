import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

const ITEM_ID = "11111111-1111-4111-8111-111111111111";

function payload() {
  return {
    share: { token: "share-token-12", clientName: "Garcia", expiresAt: null },
    brand: { type: "agency", name: "Lakbay Travel", logoUrl: null },
    trip: { id: "trip-1", title: "Baguio Weekend", clientName: "Garcia", startDate: null, endDate: null, travelerCount: 2, destinationSummary: "Baguio City" },
    itinerary: {
      id: "iter-1",
      title: "Baguio Weekend",
      summary: null,
      version: 1,
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          date: null,
          title: "Arrival",
          summary: null,
          items: [
            {
              id: ITEM_ID,
              sortOrder: 0,
              type: "ACTIVITY",
              title: "Burnham Park",
              description: null,
              startTime: "09:00",
              endTime: "10:00",
              clientNotes: null,
              placeSnapshot: null,
            },
          ],
        },
      ],
    },
    revision: "rev-1",
  };
}

async function renderLoaded() {
  render(<PublicItineraryPage />);
  await screen.findByRole("heading", { level: 1, name: "Baguio Weekend" });
}

function openDayForm() {
  fireEvent.click(screen.getByRole("button", { name: "Comment on Day 1" }));
  return screen.getByRole("form", { name: "Comment on Day 1" });
}

beforeEach(() => {
  localStorage.clear();
  api.postPublicComment.mockReset();
  api.listPublicComments.mockResolvedValue({ comments: [] });
  api.fetchPublicItinerary.mockResolvedValue(payload());
});

describe("share page comments for a first-time visitor who skipped the welcome", () => {
  beforeEach(() => {
    localStorage.setItem("voyage_share_welcome_skipped:share-token-12", "1");
  });

  it("does not ask for a name before they want to comment", async () => {
    await renderLoaded();
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.queryByText(/let us know your name/i)).toBeNull();
  });

  it("opens the day's comment form right away, asking for a name there", async () => {
    await renderLoaded();
    const form = openDayForm();
    const name = within(form).getByLabelText("Your name");
    expect(name).toHaveFocus();
    expect(within(form).getByLabelText(/Email \(optional\)/)).toBeInTheDocument();
    expect(within(form).getByLabelText("Your comment")).toBeInTheDocument();
  });

  it("sends a day comment with just a name, no email, and remembers the name", async () => {
    api.postPublicComment.mockResolvedValue({
      comment: { id: "c-1", authorName: "Jhoy", content: "Start later?", dayNumber: 1, itemId: null, status: "PENDING" },
    });
    await renderLoaded();
    const form = openDayForm();
    fireEvent.change(within(form).getByLabelText("Your name"), { target: { value: "  Jhoy " } });
    fireEvent.change(within(form).getByLabelText("Your comment"), { target: { value: "Start later?" } });
    await act(async () => {
      fireEvent.click(within(form).getByRole("button", { name: "Send" }));
    });

    expect(api.postPublicComment).toHaveBeenCalledWith("share-token-12", {
      authorName: "Jhoy",
      content: "Start later?",
      dayNumber: 1,
    });
    expect(localStorage.getItem("voyage_commenter_name")).toBe("Jhoy");
    expect(localStorage.getItem("voyage_commenter_email")).toBeNull();
    expect(screen.getByText("Comment sent!")).toBeInTheDocument();
  });

  it("includes the email when one is given", async () => {
    api.postPublicComment.mockResolvedValue({ comment: { id: "c-2", authorName: "Jhoy", content: "Hi", status: "PENDING" } });
    await renderLoaded();
    const form = openDayForm();
    fireEvent.change(within(form).getByLabelText("Your name"), { target: { value: "Jhoy" } });
    fireEvent.change(within(form).getByLabelText(/Email \(optional\)/), { target: { value: "jhoy@example.com" } });
    fireEvent.change(within(form).getByLabelText("Your comment"), { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.click(within(form).getByRole("button", { name: "Send" }));
    });
    expect(api.postPublicComment).toHaveBeenCalledWith("share-token-12", {
      authorName: "Jhoy",
      authorEmail: "jhoy@example.com",
      content: "Hi",
      dayNumber: 1,
    });
    expect(localStorage.getItem("voyage_commenter_email")).toBe("jhoy@example.com");
  });

  it("explains a missing name instead of sending", async () => {
    await renderLoaded();
    const form = openDayForm();
    fireEvent.change(within(form).getByLabelText("Your comment"), { target: { value: "Start later?" } });
    await act(async () => {
      fireEvent.click(within(form).getByRole("button", { name: "Send" }));
    });
    expect(api.postPublicComment).not.toHaveBeenCalled();
    expect(within(form).getByText("Please enter your name")).toBeInTheDocument();
    expect(within(form).getByLabelText("Your name")).toHaveFocus();
  });

  it("says comments are closed when the link has expired", async () => {
    api.postPublicComment.mockRejectedValue(Object.assign(new Error("expired"), { status: 410 }));
    await renderLoaded();
    const form = openDayForm();
    fireEvent.change(within(form).getByLabelText("Your name"), { target: { value: "Jhoy" } });
    fireEvent.change(within(form).getByLabelText("Your comment"), { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.click(within(form).getByRole("button", { name: "Send" }));
    });
    expect(within(form).getByText(/link has expired/i)).toBeInTheDocument();
  });
});

describe("share page comments for a returning visitor", () => {
  beforeEach(() => {
    localStorage.setItem("voyage_commenter_name", "Tester");
  });

  it("goes straight to the comment box and shows who is commenting", async () => {
    await renderLoaded();
    const form = openDayForm();
    expect(within(form).queryByLabelText("Your name")).toBeNull();
    expect(within(form).getByText(/Commenting as/)).toHaveTextContent("Commenting as Tester");
    expect(within(form).getByLabelText("Your comment")).toHaveFocus();
  });

  it("lets them change the name", async () => {
    await renderLoaded();
    const form = openDayForm();
    fireEvent.click(within(form).getByRole("button", { name: "Change" }));
    expect(within(form).getByLabelText("Your name")).toHaveValue("Tester");
  });
});

describe("comments on parts of the trip that have since changed", () => {
  it("still shows them, under general feedback, with a note", async () => {
    api.listPublicComments.mockResolvedValue({
      comments: [
        { id: "c-gone-item", authorName: "Jhoy", content: "Skip the museum?", dayNumber: 1, itemId: "22222222-2222-4222-8222-222222222222", status: "ADDRESSED", agencyReply: "Removed it" },
        { id: "c-gone-day", authorName: "Jhoy", content: "Day 3 is too long", dayNumber: 3, itemId: null, status: "PENDING" },
      ],
    });
    await renderLoaded();
    const general = screen.getByRole("region", { name: "General Feedback" });
    expect(await within(general).findByText("Skip the museum?")).toBeInTheDocument();
    expect(within(general).getByText("Removed it")).toBeInTheDocument();
    expect(within(general).getByText("Day 3 is too long")).toBeInTheDocument();
    expect(within(general).getAllByText("About a part of the trip that has since changed")).toHaveLength(2);
  });
});

describe("share page title", () => {
  it("names the trip and the agency in the browser tab", async () => {
    await renderLoaded();
    expect(document.title).toBe("Baguio Weekend · Lakbay Travel");
  });
});
