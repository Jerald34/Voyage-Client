// tests/landing-hero.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);

import LandingHeader from "../app/components/landing/LandingHeader.jsx";
import LandingHero from "../app/components/landing/LandingHero.jsx";
import { SAMPLE_TRIP } from "../app/components/landing/sample/sampleTrip.js";

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

describe("LandingHeader accessibility", () => {
  it("names the logo link for where it goes", () => {
    render(<LandingHeader onLogin={vi.fn()} onStartPlanning={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Voyage, back to top" })).toHaveAttribute("href", "#top");
  });

  it("rings the theme toggle at 44px like the other controls", () => {
    render(<LandingHeader onLogin={vi.fn()} onStartPlanning={vi.fn()} />);

    const classes = screen.getByRole("button", { name: /Switch to (dark|light) mode/ }).className.split(/\s+/);
    for (const expected of ["h-11!", "w-11!", "rounded-full", "focus-visible:outline-2", "focus-visible:outline-secondary-strong"]) {
      expect(classes).toContain(expected);
    }
  });

  it("drops Log in under 380px so the header fits a 320px viewport; the footer keeps it", () => {
    render(<LandingHeader onLogin={vi.fn()} onStartPlanning={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Log in" }).className.split(/\s+/)).toContain("max-[379px]:hidden");
    expect(screen.getByRole("button", { name: "Start planning" }).className).not.toContain("max-[379px]:hidden");
  });
});

describe("LandingHero", () => {
  it("is not a landmark of its own: its region would only repeat the h1", () => {
    const { container } = render(<LandingHero onStartPlanning={vi.fn()} onWatchDemo={vi.fn()} />);

    expect(container.querySelector("section").hasAttribute("aria-labelledby")).toBe(false);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("leads with the one serif h1 and the real sample trip on day 2", () => {
    render(<LandingHero onStartPlanning={vi.fn()} onWatchDemo={vi.fn()} />);

    const h1 = screen.getByRole("heading", { level: 1, name: "Plan client trips in minutes, not hours" });
    expect(h1.className).toContain("font-serif");
    expect(h1.className).toContain("font-normal");
    expect(screen.getByRole("radio", { name: "Day 2" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Mines View Park", { selector: "h3" })).toBeInTheDocument();
  });

  it("titles the sample card with a sans h2, so the stop cards' h3s don't sit directly under the h1", () => {
    render(<LandingHero onStartPlanning={vi.fn()} onWatchDemo={vi.fn()} />);

    const title = screen.getByRole("heading", { level: 2, name: SAMPLE_TRIP.itinerary.title });
    expect(title.className).toContain("font-sans");
    expect(title.className).not.toContain("font-serif");
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
