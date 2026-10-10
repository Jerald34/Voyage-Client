// tests/landing-sections.test.jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);

import { Faq, FinalCta, ForAgencies, HowItWorks, LandingFooter, WhatItDoes } from "../app/components/landing/LandingSections.jsx";

describe("landing lower sections", () => {
  it("anchors each section the nav links to, with sans h2s", () => {
    const { container } = render(
      <>
        <WhatItDoes />
        <HowItWorks />
        <ForAgencies />
        <Faq />
      </>,
    );

    for (const id of ["what-it-does", "how-it-works", "for-agencies", "faq"]) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
    }
    for (const h2 of screen.getAllByRole("heading", { level: 2 })) {
      expect(h2.className).toContain("font-sans");
    }
  });

  it("lists eight features, four steps and two audiences", () => {
    render(
      <>
        <WhatItDoes />
        <HowItWorks />
        <ForAgencies />
      </>,
    );

    expect(within(screen.getByRole("list", { name: "Features" })).getAllByRole("listitem")).toHaveLength(8);
    expect(within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "For agency owners" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For agents" })).toBeInTheDocument();
  });

  it("puts each answer behind its question in a native disclosure", () => {
    render(<Faq />);

    const summary = screen.getByText("What does my client see?");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).toHaveTextContent(/They don't need an account/);
  });

  it("routes the final CTA and footer actions", () => {
    const onStartPlanning = vi.fn();
    const onLogin = vi.fn();
    render(
      <>
        <FinalCta onStartPlanning={onStartPlanning} />
        <LandingFooter onLogin={onLogin} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start planning" }));
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(onStartPlanning).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/pricing/i)).not.toBeInTheDocument();
  });

  it("gives every footer link its padding and text size as separate classes", () => {
    render(<LandingFooter onLogin={vi.fn()} />);

    const footerLinks = [...within(screen.getByRole("navigation", { name: "Footer" })).getAllByRole("link"), screen.getByRole("button", { name: "Log in" })];
    expect(footerLinks.length).toBeGreaterThan(1);
    for (const link of footerLinks) {
      const classes = link.className.split(/\s+/);
      expect(classes).toContain("px-2");
      expect(classes).toContain("text-sm");
    }
  });

  it("lifts the closing band off the dark page background with a surface and an edge", () => {
    const { container } = render(<FinalCta onStartPlanning={vi.fn()} />);

    // bg-sidebar (#0d1013) is 1.03:1 against the dark page (#111416): invisible without these.
    const classes = container.querySelector("section").className.split(/\s+/);
    expect(classes).toContain("bg-sidebar");
    expect(classes).toContain("dark:bg-surface-elevated");
    expect(classes).toContain("dark:border-y");
    expect(classes).toContain("dark:border-border/40");
  });
});
