import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../app/components/theme/ThemeToggle", () => ({
  default: () => <button type="button">Toggle theme</button>,
}));

import ShareHeader, { PoweredByVoyage } from "../app/itinerary/view/[token]/components/ShareHeader.jsx";

describe("ShareHeader", () => {
  it("leads with the agency's own brand", () => {
    render(<ShareHeader brand={{ type: "agency", name: "Island Hops Travel", logoUrl: "https://cdn.example/logo.png" }} />);

    expect(screen.getByText("Island Hops Travel")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Island Hops Travel" })).toHaveAttribute("src", "https://cdn.example/logo.png");
    expect(screen.queryByRole("img", { name: "Voyage" })).toBeNull();
  });

  it("caps a very wide agency logo so the brand name keeps its room on phones", () => {
    render(<ShareHeader brand={{ type: "agency", name: "Island Hops Travel", logoUrl: "https://cdn.example/wide-logo.png" }} />);
    const logo = screen.getByRole("img", { name: "Island Hops Travel" });

    expect(logo.className).toContain("max-w-[40vw]");
    expect(logo.className).toContain("sm:max-w-[200px]");
  });

  it("sets the agency name like a personal name, in the dashboard's sans (Design decision 6)", () => {
    render(<ShareHeader brand={{ type: "agency", name: "Island Hops Travel", logoUrl: null }} />);
    const name = screen.getByText("Island Hops Travel");

    expect(name.className).toContain("font-semibold");
    expect(name.className).not.toContain("font-serif");
  });

  it("names who shared a personal itinerary", () => {
    render(<ShareHeader brand={{ type: "personal", displayName: "Ana Reyes" }} />);

    expect(screen.getByText("Shared by")).toBeInTheDocument();
    expect(screen.getByText("Ana Reyes")).toBeInTheDocument();
  });

  it("shows the Voyage logo when there is no brand", () => {
    render(<ShareHeader brand={null} />);

    expect(screen.getByRole("img", { name: "Voyage" })).toBeInTheDocument();
  });

  it("sits on the app's glass frame, not a solid navy bar, and keeps the theme toggle", () => {
    const { container } = render(<ShareHeader brand={null} />);
    const header = container.querySelector("header");

    expect(header.className).not.toMatch(/\bbg-sidebar\b/);
    expect(header.className).not.toMatch(/\btext-white\b/);
    expect(header.className).toContain("--frame-panel");
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
  });
});

describe("PoweredByVoyage", () => {
  it("credits Voyage with the logo", () => {
    render(<PoweredByVoyage />);

    expect(screen.getByText("Powered by")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Voyage" })).toBeInTheDocument();
  });
});
