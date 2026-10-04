import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import DashboardGreeting from "../app/agency/[agencyId]/components/dashboard/widgets/DashboardGreeting.jsx";
import EmptyState from "../app/agency/[agencyId]/components/dashboard/widgets/EmptyState.jsx";
import HeroContinueCard from "../app/agency/[agencyId]/components/dashboard/widgets/HeroContinueCard.jsx";
import MyWorkColumn from "../app/agency/[agencyId]/components/dashboard/widgets/MyWorkColumn.jsx";

const NOW = new Date(2026, 9, 3, 10, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DashboardGreeting subtitle", () => {
  const subtitle = (container) => container.querySelector("h1 + p");

  it("keeps its line while the count is unknown, so the page doesn't jump when it arrives", () => {
    const { container, rerender } = render(<DashboardGreeting name="Maria" count={null} onNewTrip={() => {}} now={NOW} />);

    expect(subtitle(container)).not.toBeNull();
    expect(subtitle(container)).toBeEmptyDOMElement();
    expect(subtitle(container).className).toContain("min-h-5");

    rerender(<DashboardGreeting name="Maria" count={3} onNewTrip={() => {}} now={NOW} />);
    expect(subtitle(container)).toHaveTextContent("3 things need you today");
    expect(subtitle(container).className).toContain("min-h-5");
  });
});

describe("EmptyState compact", () => {
  it("fits a narrow column: tighter padding and a sans semibold title", () => {
    const { container } = render(<EmptyState variant="staff-hero" compact />);

    const title = screen.getByRole("heading", { name: "Ready when you are." });
    expect(title.className).toContain("font-sans");
    expect(title.className).toContain("font-semibold");
    expect(title.className).toContain("text-[13px]");
    expect(title.className).not.toContain("font-extrabold");
    expect(container.firstChild.className).toContain("py-4");
    expect(container.firstChild.className).not.toContain("py-8");
  });

  it("leaves the default unchanged", () => {
    const { container } = render(<EmptyState variant="staff-hero" />);

    const title = screen.getByRole("heading", { name: "Ready when you are." });
    expect(title.className).toContain("font-extrabold");
    expect(title.className).not.toContain("font-sans");
    expect(container.firstChild.className).toContain("py-8");
  });

  it("is what the staff Your work column shows when there is no trip to continue", () => {
    render(<HeroContinueCard trip={null} onContinue={() => {}} />);

    expect(screen.getByRole("heading", { name: "Ready when you are." }).className).toContain("font-semibold");
  });
});

describe("MyWorkColumn recent trip times", () => {
  function timeFor(offsetMs) {
    const updatedAt = new Date(NOW.getTime() - offsetMs).toISOString();
    const { container, unmount } = render(
      <MyWorkColumn
        hero={null}
        recent={[{ tripId: "t1", tripTitle: "Kyoto", clientName: "Reyes", statusChip: "DRAFT", updatedAt }]}
        pipeline={null}
        agencyId="a1"
        onOpenTrip={() => {}}
      />,
    );
    const text = container.querySelector("button .tabular-nums")?.textContent;
    unmount();
    return text;
  }

  it("says just now under a minute, not 0m ago", () => {
    expect(timeFor(0)).toBe("Just now");
    expect(timeFor(59_000)).toBe("Just now");
  });

  it("counts minutes, hours and days after that", () => {
    expect(timeFor(60_000)).toBe("1m ago");
    expect(timeFor(59 * 60_000)).toBe("59m ago");
    expect(timeFor(3 * 3_600_000)).toBe("3h ago");
    expect(timeFor(2 * 86_400_000)).toBe("2d ago");
  });

  it("treats a time slightly in the future (clock drift) as just now, never negative minutes", () => {
    expect(timeFor(-5 * 60_000)).toBe("Just now");
  });
});
