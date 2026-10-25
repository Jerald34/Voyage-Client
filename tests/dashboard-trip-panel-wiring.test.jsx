import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixtures from "./fixtures/dashboard-payloads.json";

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock("../app/components/icons/index.js", () => ({ ChatIcon: () => null, CloseIcon: () => null, ReplyIcon: () => null }));
vi.mock("../app/lib/api/client.js", () => ({ API_URL: "/api", fetchApi: (...args) => mocks.fetchApi(...args) }));

import OwnerOverview from "../app/agency/[agencyId]/components/dashboard/OwnerOverview.jsx";
import StaffMyWork from "../app/agency/[agencyId]/components/dashboard/StaffMyWork.jsx";
import { resetCalendarCacheForTests } from "../app/hooks/useCalendarEvents.js";

const kyotoComment = fixtures.ownerBusy.clientComments.waiting[0];

beforeEach(() => {
  mocks.fetchApi.mockReset();
  mocks.push.mockReset();
  resetCalendarCacheForTests();
  mocks.fetchApi.mockImplementation((path) => {
    const url = String(path);
    if (url.includes("/dashboard/trips/")) {
      return Promise.resolve({
        trip: { id: kyotoComment.tripId, title: kyotoComment.tripTitle, status: "IN_REVIEW", clientName: "Santos Family" },
        share: null,
        comments: [{ ...kyotoComment, content: kyotoComment.excerpt, status: "PENDING", itemId: null }],
      });
    }
    return new Promise(() => {});
  });
});

describe.each([
  ["owner", fixtures.ownerBusy, (props) => <OwnerOverview agencyId="agency-1" {...props} />],
  ["staff", fixtures.staff, (props) => <StaffMyWork agencyId="agency-1" {...props} />],
])("%s dashboard", (_name, payload, ui) => {
  it("shows the Client comments card under Needs you today", () => {
    render(ui({ initialData: payload }));
    const needsYou = screen.getByRole("region", { name: "Needs you today" });
    const card = screen.getByRole("region", { name: "Client comments" });
    expect(needsYou.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens the trip panel at a comment from the card, with its reply box ready", async () => {
    render(ui({ initialData: payload }));
    const card = screen.getByRole("region", { name: "Client comments" });
    fireEvent.click(within(card).getAllByRole("button", { name: new RegExp(`^${kyotoComment.authorName}`) })[0]);
    const panel = await screen.findByRole("dialog", { name: new RegExp(`^Trip: ${kyotoComment.tripTitle}`) });
    await waitFor(() => expect(within(panel).getByPlaceholderText("Write a reply…")).toHaveFocus());
  });

  it("opens the trip panel, not the Planner, for an expiring link's Extend", async () => {
    render(ui({ initialData: payload }));
    const needsYou = screen.getByRole("region", { name: "Needs you today" });
    const showAll = within(needsYou).queryByRole("button", { name: /^Show all/ });
    if (showAll) fireEvent.click(showAll);
    fireEvent.click(within(needsYou).getAllByRole("button", { name: "Extend" })[0]);
    expect(await screen.findByRole("dialog", { name: /^Trip:/ })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("still resumes a stuck draft in the Planner", () => {
    render(ui({ initialData: payload }));
    const needsYou = screen.getByRole("region", { name: "Needs you today" });
    const showAll = within(needsYou).queryByRole("button", { name: /^Show all/ });
    if (showAll) fireEvent.click(showAll);
    fireEvent.click(within(needsYou).getAllByRole("button", { name: "Resume" })[0]);
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// A trip list (trip progress stage, staff counter) hands over to the trip panel:
// only one drawer is ever open, and closing the panel returns focus to the number.
describe.each([
  ["owner trip progress", fixtures.ownerBusy, (props) => <OwnerOverview agencyId="agency-1" {...props} />, /^Trips created: \d+\. Open trip list\.$/],
  ["staff counter", fixtures.staff, (props) => <StaffMyWork agencyId="agency-1" {...props} />, /In review/],
])("%s list", (_name, payload, ui, opener) => {
  it("closes before the trip panel opens, and focus returns to the number on close", async () => {
    render(ui({ initialData: payload }));
    const number = screen.getAllByRole("button", { name: opener })[0];
    number.focus();
    fireEvent.click(number);

    const list = screen.getByRole("dialog");
    fireEvent.click(within(list).getByRole("button", { name: new RegExp(`^${kyotoComment.tripTitle}`) }));

    const panel = await screen.findByRole("dialog", { name: new RegExp(`^Trip: ${kyotoComment.tripTitle}`) });
    expect(screen.getAllByRole("dialog")).toEqual([panel]);
    // Let the panel finish loading, so nothing updates after the test ends.
    expect(await within(panel).findByText(kyotoComment.excerpt, { selector: "p" })).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Close panel" }));
    expect(number).toHaveFocus();
  });
});
