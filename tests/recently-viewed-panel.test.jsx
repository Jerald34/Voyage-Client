import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecentlyViewedPanel from "../app/agency/[agencyId]/components/dashboard/widgets/RecentlyViewedPanel.jsx";

const NOW = new Date("2026-09-27T04:00:00.000Z");
const hoursAgo = (hours) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

const VIEWS = [
  { tripId: "t1", tripTitle: "Kyoto Autumn Escape", clientName: "Maria Santos", viewCount: 4, lastViewedAt: hoursAgo(5) },
  { tripId: "t2", tripTitle: "Palawan Family Trip", clientName: "Lim Family", viewCount: 2, lastViewedAt: hoursAgo(96) },
  { tripId: "t3", tripTitle: "Boracay Barkada Weekend", clientName: null, viewCount: 1, lastViewedAt: hoursAgo(144) },
  { tripId: "t4", tripTitle: "Cebu Island Hop", clientName: "Garcia Family", viewCount: 1, lastViewedAt: hoursAgo(288) },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const panel = () => screen.getByRole("region", { name: "Recently viewed" });
const rows = () => within(panel()).getAllByRole("button", { name: /views?,/ });

describe("RecentlyViewedPanel", () => {
  it("lists the three newest views, each naming the trip, client, views and time", () => {
    render(<RecentlyViewedPanel views={VIEWS} onOpenTrip={vi.fn()} />);

    expect(rows().map((row) => row.getAttribute("aria-label"))).toEqual([
      "Kyoto Autumn Escape, Maria Santos, 4 views, last viewed 5 hours ago",
      "Palawan Family Trip, Lim Family, 2 views, last viewed 4 days ago",
      "Boracay Barkada Weekend, 1 view, last viewed 6 days ago",
    ]);
    expect(within(rows()[0]).getByText("4 views")).toBeInTheDocument();
    expect(within(rows()[0]).getByText("5h ago")).toBeInTheDocument();
    expect(within(panel()).getByText("Last 30 days")).toBeInTheDocument();
  });

  it("shows the rest behind Show all, and hides them again", () => {
    render(<RecentlyViewedPanel views={VIEWS} onOpenTrip={vi.fn()} />);

    const toggle = within(panel()).getByRole("button", { name: "Show all (4)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(within(panel()).getByRole("button", { name: /^Cebu Island Hop,/ })).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Show fewer" }));
    expect(within(panel()).queryByRole("button", { name: /^Cebu Island Hop,/ })).not.toBeInTheDocument();
  });

  it("shows at most five views even when sent more", () => {
    const six = [
      ...VIEWS,
      { tripId: "t5", tripTitle: "Siargao Surf Week", clientName: "Reyes", viewCount: 1, lastViewedAt: hoursAgo(300) },
      { tripId: "t6", tripTitle: "Bohol Weekend", clientName: "Cruz", viewCount: 1, lastViewedAt: hoursAgo(320) },
    ];
    render(<RecentlyViewedPanel views={six} onOpenTrip={vi.fn()} />);

    fireEvent.click(within(panel()).getByRole("button", { name: "Show all (5)" }));
    expect(rows()).toHaveLength(5);
    expect(within(panel()).getByRole("button", { name: /^Siargao Surf Week,/ })).toBeInTheDocument();
    expect(within(panel()).queryByRole("button", { name: /^Bohol Weekend,/ })).not.toBeInTheDocument();
  });

  it("opens the trip a row names", () => {
    const onOpenTrip = vi.fn();
    render(<RecentlyViewedPanel views={VIEWS} onOpenTrip={onOpenTrip} />);

    fireEvent.click(within(panel()).getByRole("button", { name: /^Palawan Family Trip,/ }));
    expect(onOpenTrip).toHaveBeenCalledWith("t2", "Palawan Family Trip", "Lim Family");
  });

  it("says when no client has looked in 30 days", () => {
    render(<RecentlyViewedPanel views={[]} onOpenTrip={vi.fn()} />);

    expect(within(panel()).getByText("No client views in the last 30 days")).toBeInTheDocument();
    expect(within(panel()).getByText("Views show up here when a client opens a shared itinerary link.")).toBeInTheDocument();
  });

  it("gives its rows the dashboard's tile style, press feedback and a focus ring", () => {
    render(<RecentlyViewedPanel views={VIEWS} onOpenTrip={vi.fn()} />);

    const row = within(panel()).getByRole("button", { name: /^Kyoto Autumn Escape,/ });
    expect(row.className).toContain("frame-tile");
    expect(row.className).toContain("active:scale-[0.97]");
    expect(row.className).toContain("focus-visible:ring-2");
  });

  it("keeps a row's second line in the server HTML when the client has no name", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<RecentlyViewedPanel views={VIEWS} onOpenTrip={() => {}} />);

    // The time line waits for the browser's clock, so the name line alone must hold the row's height.
    const row = container.querySelector('button[aria-label^="Boracay Barkada Weekend"]');
    expect(row.lastElementChild.firstElementChild.textContent).toBe("\u00a0");
  });

  it("hydrates without a mismatch, then shows times by the browser's clock", async () => {
    const element = <RecentlyViewedPanel views={VIEWS} onOpenTrip={() => {}} />;
    vi.setSystemTime(new Date(NOW.getTime() - 3 * 3_600_000)); // the server's clock is 3h behind
    const html = renderToString(element);
    expect(html).not.toContain(" ago");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    vi.setSystemTime(NOW);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const problems = [];
    vi.spyOn(console, "error").mockImplementation((...args) => problems.push(args.map(String).join(" ")));
    await act(async () => {
      hydrateRoot(container, element, { onRecoverableError: (error) => problems.push(String(error?.message ?? error)) });
    });

    expect(problems).toEqual([]);
    expect(container).toHaveTextContent("5h ago");
  });
});
