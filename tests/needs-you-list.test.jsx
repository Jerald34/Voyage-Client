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

  it("passes the clicked item to onAction", () => {
    const onAction = vi.fn();
    render(<NeedsYouList items={[item(1), item(2)]} onAction={onAction} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Reply" })[1]);

    expect(onAction).toHaveBeenCalledWith(item(2));
  });

  it("says when everything is done", () => {
    render(<NeedsYouList items={[]} onAction={() => {}} />);

    expect(screen.getByText("All caught up.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });
});
