import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }) => <svg data-testid="qr" data-value={value} />,
  QRCodeCanvas: () => null,
}));

import ShareLinkResult from "../app/components/trip-dashboard/itinerary/ShareLinkResult.jsx";

const URL = "https://voyage.test/itinerary/view/abc123";

describe("ShareLinkResult", () => {
  it("shows the link and a QR code for the same link", () => {
    render(<ShareLinkResult shareUrl={URL} tripTitle="2-Day Baguio" />);

    expect(screen.getByRole("heading", { name: "Share Link Ready" })).toBeInTheDocument();
    expect(screen.getByText(URL)).toBeInTheDocument();
    expect(screen.getByTestId("qr")).toHaveAttribute("data-value", URL);
  });

  it("copies the link", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareLinkResult shareUrl={URL} tripTitle="2-Day Baguio" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("offers another link only when the caller can make one", () => {
    const { rerender } = render(<ShareLinkResult shareUrl={URL} tripTitle="t" />);
    expect(screen.queryByRole("button", { name: "Generate another link" })).not.toBeInTheDocument();

    const onGenerateAnother = vi.fn();
    rerender(<ShareLinkResult shareUrl={URL} tripTitle="t" onGenerateAnother={onGenerateAnother} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate another link" }));
    expect(onGenerateAnother).toHaveBeenCalledTimes(1);
  });
});
