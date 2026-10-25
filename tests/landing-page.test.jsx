import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
vi.mock("qrcode.react", () => ({ QRCodeSVG: () => null, QRCodeCanvas: () => null }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicStub() {
      return <div data-testid="dynamic-stub" />;
    },
}));

const mockNavigation = { routerPush: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockNavigation.routerPush }),
  useSearchParams: () => ({ get: () => null }),
}));

import LandingPage from "../app/components/landing/LandingPage.jsx";
import Page from "../app/page.jsx";

function renderPage() {
  const onLogin = vi.fn();
  const onStartPlanning = vi.fn();
  const utils = render(<LandingPage onLogin={onLogin} onStartPlanning={onStartPlanning} />);
  return { ...utils, onLogin, onStartPlanning };
}

const originalPause = window.HTMLMediaElement.prototype.pause;

beforeEach(() => {
  mockNavigation.routerPush.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  // Unmount first: closing the video modal calls pause(), so the stub must outlive the unmount.
  cleanup();
  window.HTMLMediaElement.prototype.pause = originalPause;
});

describe("landing page", () => {
  it("has one h1 and every section, in the approved order", () => {
    const { container } = renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const ids = [...container.querySelectorAll("main section[id]")].map((s) => s.id);
    expect(ids).toEqual(["sample-trip", "after-the-plan", "what-it-does", "built-on", "how-it-works", "for-agencies", "pricing", "faq"]);
  });

  it("shows the real sample trip in the hero and the annotated section", () => {
    renderPage();

    expect(screen.getAllByText("Mines View Park", { selector: "h3" })).toHaveLength(2);
  });

  it("sends every Start planning to sign-up and Log in to login", () => {
    const { onLogin, onStartPlanning } = renderPage();

    for (const button of screen.getAllByRole("button", { name: /Start planning/ })) fireEvent.click(button);
    for (const button of screen.getAllByRole("button", { name: "Log in" })) fireEvent.click(button);
    expect(onStartPlanning).toHaveBeenCalledTimes(3); // header, hero, final CTA
    expect(onLogin).toHaveBeenCalledTimes(2); // header, footer
  });

  it("starts the free trial from the Pricing section through sign-up", () => {
    const { onStartPlanning } = renderPage();
    for (const button of screen.getAllByRole("button", { name: "Start free trial" })) fireEvent.click(button);
    expect(onStartPlanning).toHaveBeenCalledTimes(3);
  });

  it("opens the demo video", () => {
    window.HTMLMediaElement.prototype.pause = vi.fn();
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Watch the demo" }));
    expect(screen.getByRole("dialog", { name: "Voyage demo video" })).toBeInTheDocument();
  });

  it("offers a skip link to the main content, and the target can take focus", () => {
    const { container } = renderPage();

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    const main = container.querySelector("main#main");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main.className).toContain("scroll-mt-24");
  });

  it("is rooted at #top and clips instead of hiding overflow, so the sticky header still sticks", () => {
    const { container } = renderPage();

    const root = container.firstElementChild;
    expect(root).toHaveAttribute("id", "top");
    // overflow-x: hidden makes the root a scroll container, which stops position: sticky on the header.
    expect(root.className).not.toContain("overflow-x-hidden");
    expect(root.className).toContain("overflow-x-clip");
  });
});

describe("signed-out home page", () => {
  it("sends Start planning to the sign-up form and Log in to the login form", () => {
    render(<Page />);

    fireEvent.click(screen.getAllByRole("button", { name: /Start planning/ })[0]);
    expect(mockNavigation.routerPush).toHaveBeenLastCalledWith("/login?mode=register");

    fireEvent.click(screen.getAllByRole("button", { name: "Log in" })[0]);
    expect(mockNavigation.routerPush).toHaveBeenLastCalledWith("/login");
  }, 10000);
});
