import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listTripShares: vi.fn(),
  revokeShare: vi.fn(),
  createItineraryShare: vi.fn(),
  regenerateShare: vi.fn(),
}));

vi.mock("../app/lib/api/index.js", () => api);
// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  return { CloseIcon: Icon, CheckIcon: Icon, EyeIcon: Icon, LinkIcon: Icon, RefreshIcon: Icon, CopyIcon: Icon, ShareIcon: Icon };
});
vi.mock("../app/components/trip-dashboard/itinerary/ShareLinkPanel.jsx", () => ({ default: () => null }));

import ShareDialog from "../app/components/trip-dashboard/itinerary/ShareDialog.jsx";

const AGENCY_ID = "agency-1";
const liveShare = {
  id: "share-1",
  token: "old-token-123",
  itineraryId: "it-older-option",
  clientName: "Reyes",
  clientEmail: "reyes@example.com",
  expiresAt: "2099-01-01T00:00:00.000Z",
  revokedAt: null,
  viewCount: 4,
  createdAt: "2026-10-20T00:00:00.000Z",
};

async function renderDialog() {
  render(
    <ShareDialog isOpen onClose={() => {}} agencyId={AGENCY_ID} itineraryId="it-current" tripId="trip-1" tripTitle="Reyes family" />
  );
  return screen.findByRole("button", { name: /Regenerate/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listTripShares.mockResolvedValue({ shares: [liveShare] });
});

describe("Share dialog Regenerate", () => {
  it("asks the server to swap the link, so the client, email and expiry carry over", async () => {
    api.regenerateShare.mockResolvedValue({ share: { ...liveShare, id: "share-2", token: "new-token-12" } });
    const button = await renderDialog();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.regenerateShare).toHaveBeenCalledWith(AGENCY_ID, "share-1");
    // No blank link for whichever itinerary happens to be open, and no separate revoke.
    expect(api.createItineraryShare).not.toHaveBeenCalled();
    expect(api.revokeShare).not.toHaveBeenCalled();
    expect(api.listTripShares).toHaveBeenCalledTimes(2);
  });

  it("says so when the new link could not be made", async () => {
    api.regenerateShare.mockRejectedValue(Object.assign(new Error("nope"), { status: 409, message: "This link has expired. Extend it or share the itinerary again." }));
    const button = await renderDialog();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("This link has expired. Extend it or share the itinerary again.");
  });
});
