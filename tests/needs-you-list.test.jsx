import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NeedsYouList from "../app/agency/[agencyId]/components/dashboard/widgets/NeedsYouList.jsx";

const item = (n) => ({
  key: `k${n}`,
  kind: "unreadComments",
  tone: "info",
  title: `Trip ${n}`,
  subtitle: null,
  hint: null,
  actionLabel: "Reply",
  tripId: `t${n}`,
  tripTitle: `Trip ${n}`,
  clientName: null,
});

describe("NeedsYouList", () => {
  it("shows the five most urgent items and the rest on request", () => {
    render(<NeedsYouList items={[1, 2, 3, 4, 5, 6, 7].map(item)} onAction={() => {}} />);
    const list = screen.getByRole("region", { name: "Needs you today" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("7 items")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all (7)" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
  });

  it("staggers the rows in, then starts the extra rows afresh", () => {
    render(<NeedsYouList items={[1, 2, 3, 4, 5, 6, 7].map(item)} onAction={() => {}} />);
    const list = screen.getByRole("region", { name: "Needs you today" });
    const delays = () => within(list).getAllByRole("listitem").map((row) => row.style.transitionDelay);

    expect(delays()).toEqual(["0ms", "40ms", "80ms", "120ms", "160ms"]);

    fireEvent.click(screen.getByRole("button", { name: "Show all (7)" }));
    expect(delays().slice(5)).toEqual(["0ms", "40ms"]);
  });

  it("caps the stagger so a long list does not trail off", () => {
    render(<NeedsYouList items={Array.from({ length: 14 }, (_, n) => item(n + 1))} onAction={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all (14)" }));
    const delays = within(screen.getByRole("region", { name: "Needs you today" }))
      .getAllByRole("listitem")
      .map((row) => row.style.transitionDelay);
    expect(delays.slice(5)).toEqual(["0ms", "40ms", "80ms", "120ms", "160ms", "200ms", "240ms", "240ms", "240ms"]);
  });

  it("presses the Show all button in slightly", () => {
    render(<NeedsYouList items={[1, 2, 3, 4, 5, 6, 7].map(item)} onAction={() => {}} />);
    const { className } = screen.getByRole("button", { name: "Show all (7)" });
    expect(className).toContain("active:scale-[0.97]");
    expect(className).toContain("transition-[color,background-color,scale]");
  });

  it("passes the clicked item to onAction", () => {
    const onAction = vi.fn();
    render(<NeedsYouList items={[item(1), item(2)]} onAction={onAction} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Reply" })[1]);

    expect(onAction).toHaveBeenCalledWith(item(2));
  });

  it("collapses to its header line when everything is done", () => {
    render(<NeedsYouList items={[]} onAction={() => {}} />);
    const list = screen.getByRole("region", { name: "Needs you today" });
    const headerRow = screen.getByRole("heading", { name: "Needs you today" }).parentElement;

    // The status sits beside the heading, so the empty card is one line tall.
    expect(headerRow).toContainElement(within(list).getByText("All caught up."));
    // The greeting already says nothing needs you; the card doesn't repeat it.
    expect(within(list).queryByText("Nothing needs your attention right now.")).not.toBeInTheDocument();
    expect(within(list).queryByRole("heading", { name: "All caught up." })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });
});
