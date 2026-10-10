import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }) => <svg data-testid="qr" data-value={value} data-title={title} />,
  QRCodeCanvas: () => null,
}));

import ShareLinkResult from "../app/components/trip-dashboard/itinerary/ShareLinkResult.jsx";

const SHARE_URL = "https://voyage.test/itinerary/view/abc123";

function installClipboard(writeText) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  vi.useRealTimers();
  delete navigator.clipboard;
  delete document.execCommand;
});

describe("ShareLinkResult", () => {
  it("shows the link and a QR code for the same link", () => {
    render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="2-Day Baguio" />);

    expect(screen.getByRole("heading", { name: "Share Link Ready" })).toBeInTheDocument();
    expect(screen.getByText(SHARE_URL)).toBeInTheDocument();
    expect(screen.getByTestId("qr")).toHaveAttribute("data-value", SHARE_URL);
  });

  it("names the QR code after the trip, or a generic fallback", () => {
    const { rerender } = render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="2-Day Baguio" />);
    expect(screen.getByTestId("qr")).toHaveAttribute("data-title", "QR code for 2-Day Baguio");

    rerender(<ShareLinkResult shareUrl={SHARE_URL} />);
    expect(screen.getByTestId("qr")).toHaveAttribute("data-title", "QR code for this itinerary");
  });

  it("copies the link and announces it to screen readers", async () => {
    const writeText = vi.fn().mockResolvedValue();
    installClipboard(writeText);
    render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="2-Day Baguio" />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });

  it("keeps 'Copied!' for a full two seconds after the latest click", async () => {
    vi.useFakeTimers();
    installClipboard(vi.fn().mockResolvedValue());
    render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" />);
    const button = screen.getByRole("button", { name: "Copy link" });
    const click = () => act(async () => { fireEvent.click(button); });
    const advance = (ms) => act(async () => { vi.advanceTimersByTime(ms); });

    await click();
    expect(button).toHaveTextContent("Copied!");

    await advance(1500);
    await click();
    await advance(1000); // 2500ms after the first click: its stale timer must not have fired
    expect(button).toHaveTextContent("Copied!");

    await advance(1000);
    expect(button).not.toHaveTextContent("Copied!");
    expect(button).toHaveTextContent("Copy");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("leaves no timer running after unmount", async () => {
    vi.useFakeTimers();
    installClipboard(vi.fn().mockResolvedValue());
    const { unmount } = render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" />);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy link" })); });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe("when the Clipboard API is unavailable", () => {
    // Like a browser, moves focus to the selected textarea, which is then removed.
    const stubExecCommand = (result) => {
      let textarea;
      document.execCommand = vi.fn(() => {
        textarea = document.querySelector("textarea");
        textarea.focus();
        return result;
      });
      return () => textarea;
    };

    it("copies through a read-only textarea, removes it, and returns focus to the button", async () => {
      installClipboard(vi.fn().mockRejectedValue(new Error("denied")));
      const textareaUsed = stubExecCommand(true);
      render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" />);
      const button = screen.getByRole("button", { name: "Copy link" });

      await act(async () => { fireEvent.click(button); });

      expect(document.execCommand).toHaveBeenCalledWith("copy");
      expect(textareaUsed()).toHaveAttribute("readonly");
      expect(textareaUsed().value).toBe(SHARE_URL);
      expect(document.querySelector("textarea")).toBeNull();
      expect(button).toHaveFocus();
      expect(button).toHaveTextContent("Copied!");
    });

    it("does not claim success when the browser refuses, and still cleans up", async () => {
      // No Clipboard API at all (an insecure context): navigator.clipboard is undefined.
      stubExecCommand(false);
      render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" />);
      const button = screen.getByRole("button", { name: "Copy link" });

      await act(async () => { fireEvent.click(button); });

      expect(document.querySelector("textarea")).toBeNull();
      expect(button).toHaveFocus();
      expect(button).not.toHaveTextContent("Copied!");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });
  });

  it("offers another link only when the caller can make one", () => {
    const { rerender } = render(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" />);
    expect(screen.queryByRole("button", { name: "Generate another link" })).not.toBeInTheDocument();

    const onGenerateAnother = vi.fn();
    rerender(<ShareLinkResult shareUrl={SHARE_URL} tripTitle="t" onGenerateAnother={onGenerateAnother} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate another link" }));
    expect(onGenerateAnother).toHaveBeenCalledTimes(1);
  });
});
