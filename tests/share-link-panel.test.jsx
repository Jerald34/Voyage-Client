import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }) => <svg data-testid="qr" data-value={value} />,
  QRCodeCanvas: () => null,
}));
vi.mock("../app/lib/api/index.js", () => ({
  createItineraryShare: vi.fn(),
}));

import { createItineraryShare } from "../app/lib/api/index.js";
import ShareLinkPanel from "../app/components/trip-dashboard/itinerary/ShareLinkPanel.jsx";

describe("ShareLinkPanel wiring to ShareLinkResult", () => {
  beforeEach(() => {
    createItineraryShare.mockReset();
    createItineraryShare.mockResolvedValue({ share: { token: "tok123" } });
  });

  it("generates a link, shows it as a result, and returns to the form for another", async () => {
    const onShareCreated = vi.fn();
    render(
      <ShareLinkPanel agencyId="ag1" itineraryId="it1" tripTitle="2-Day Baguio" onShareCreated={onShareCreated} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Share Link" }));

    expect(await screen.findByRole("heading", { name: "Share Link Ready" })).toBeInTheDocument();
    expect(createItineraryShare).toHaveBeenCalledWith("ag1", "it1", {});
    expect(screen.getByText(/\/itinerary\/view\/tok123$/)).toBeInTheDocument();
    expect(screen.getByTestId("qr").getAttribute("data-value")).toMatch(/\/itinerary\/view\/tok123$/);
    expect(onShareCreated).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Generate another link" }));

    expect(screen.getByRole("heading", { name: "Generate Share Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Share Link" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Share Link Ready" })).not.toBeInTheDocument();
    expect(onShareCreated).toHaveBeenCalledTimes(1);
  });
});
