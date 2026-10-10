// tests/landing-hero.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);

import LandingHeader from "../app/components/landing/LandingHeader.jsx";
import LandingHero from "../app/components/landing/LandingHero.jsx";

describe("LandingHeader", () => {
  it("links to every section and has no pricing", () => {
    render(<LandingHeader onLogin={vi.fn()} onStartPlanning={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Landing" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "#what-it-does",
      "#how-it-works",
      "#for-agencies",
      "#faq",
    ]);
    expect(screen.queryByText(/pricing/i)).not.toBeInTheDocument();
  });

  it("sends Log in and Start planning to their handlers", () => {
    const onLogin = vi.fn();
    const onStartPlanning = vi.fn();
    render(<LandingHeader onLogin={onLogin} onStartPlanning={onStartPlanning} />);

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    fireEvent.click(screen.getByRole("button", { name: "Start planning" }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onStartPlanning).toHaveBeenCalledTimes(1);
  });

  it("gives each header button one base horizontal padding, so Tailwind has nothing to order", () => {
    render(<LandingHeader onLogin={vi.fn()} onStartPlanning={vi.fn()} />);

    for (const name of ["Log in", "Start planning"]) {
      const basePadding = screen.getByRole("button", { name }).className.split(/\s+/).filter((c) => /^px-/.test(c));
      expect(basePadding).toEqual(["px-3"]);
    }
  });
});

describe("LandingHero", () => {
  it("leads with the one serif h1 and the real sample trip on day 2", () => {
    render(<LandingHero onStartPlanning={vi.fn()} onWatchDemo={vi.fn()} />);

    const h1 = screen.getByRole("heading", { level: 1, name: "Plan client trips in minutes, not hours" });
    expect(h1.className).toContain("font-serif");
    expect(h1.className).toContain("font-normal");
    expect(screen.getByRole("radio", { name: "Day 2" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Mines View Park", { selector: "h3" })).toBeInTheDocument();
  });

  it("switches the sample to day 1", () => {
    render(<LandingHero onStartPlanning={vi.fn()} onWatchDemo={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Day 1" }));
    expect(screen.getByText("Baguio Botanical Garden", { selector: "h3" })).toBeInTheDocument();
  });

  it("starts planning and opens the demo", () => {
    const onStartPlanning = vi.fn();
    const onWatchDemo = vi.fn();
    render(<LandingHero onStartPlanning={onStartPlanning} onWatchDemo={onWatchDemo} />);

    fireEvent.click(screen.getByRole("button", { name: "Start planning" }));
    fireEvent.click(screen.getByRole("button", { name: "Watch the demo" }));
    expect(onStartPlanning).toHaveBeenCalledTimes(1);
    expect(onWatchDemo).toHaveBeenCalledTimes(1);
  });
});
