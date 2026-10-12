import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import UnsupportedBrowserBanner from "../app/components/system/UnsupportedBrowserBanner.jsx";

beforeEach(() => {
  sessionStorage.clear();
});

describe("UnsupportedBrowserBanner", () => {
  it("warns an older browser and names the minimum versions", () => {
    render(<UnsupportedBrowserBanner check={() => false} />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Your browser is older than Voyage supports, so some screens may not work.");
    expect(banner).toHaveTextContent("Chrome or Edge 111, Safari 16.4, Firefox 128");
  });

  it("stays hidden in a supported browser", () => {
    render(<UnsupportedBrowserBanner check={() => true} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides for the rest of the session once dismissed", () => {
    const { unmount } = render(<UnsupportedBrowserBanner check={() => false} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss browser warning" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    unmount();
    render(<UnsupportedBrowserBanner check={() => false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
