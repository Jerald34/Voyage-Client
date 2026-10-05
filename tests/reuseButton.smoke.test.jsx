import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the icons module to avoid JSX-in-.js parsing issues
vi.mock("../app/components/icons/index.js", () => ({
  RefreshIcon: ({ width, height, "aria-hidden": ariaHidden, ...props }) => (
    <svg width={width} height={height} aria-hidden={ariaHidden} {...props} data-testid="refresh-icon" />
  ),
}));

import ReuseButton from "../app/components/ratedHistory/entryPoints/ReuseButton.jsx";

describe("ReuseButton", () => {
  it("renders enabled button with count badge when count > 0", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={3}
        mode="editor"
      />
    );

    const button = screen.getByRole("button", { name: /rated history picker/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("disabled");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders disabled button with tooltip when count is 0", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={0}
        disabled={true}
        mode="editor"
      />
    );

    const button = screen.getByRole("button", { name: /rated history picker/i });
    expect(button).toHaveAttribute("disabled");
    expect(button).toHaveAttribute("title", "No rated trips yet");
    expect(button).toHaveClass("opacity-50");
    expect(button).toHaveClass("cursor-not-allowed");
  });

  it("shows 99+ badge when count exceeds 99", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={150}
        mode="editor"
      />
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("invokes onClick callback when clicked", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={5}
        mode="editor"
      />
    );

    const button = screen.getByRole("button", { name: /rated history picker/i });
    button.click();
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when disabled prop is true", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={5}
        disabled={true}
        mode="editor"
      />
    );

    const button = screen.getByRole("button", { name: /rated history picker/i });
    expect(button).toHaveAttribute("disabled");
    expect(button).toHaveClass("opacity-50");
  });

  it("has correct aria-label", () => {
    const mockClick = vi.fn();
    render(
      <ReuseButton
        onClick={mockClick}
        count={3}
        mode="editor"
      />
    );

    expect(screen.getByLabelText(/rated history picker/i)).toBeInTheDocument();
  });

  it("lets the itinerary header's width decide whether the label shows", () => {
    render(<ReuseButton onClick={vi.fn()} count={4} mode="clientItinerary" />);
    const label = screen.getByText("Reuse");

    expect(label.className).toContain("hidden");
    expect(label.className).toContain("@min-[720px]:inline");
  });

  it("presses like its neighbours in the itinerary header", () => {
    render(<ReuseButton onClick={vi.fn()} count={4} mode="clientItinerary" />);
    const { className } = screen.getByRole("button", { name: /rated history picker/i });

    expect(className).toContain("gap-1.5");
    expect(className).toContain("transition-[background-color,border-color,color,scale]");
    expect(className).toContain("duration-150");
    expect(className).toContain("ease-out");
    expect(className).toContain("active:scale-[0.97]");
    expect(className).toContain("motion-reduce:transition-none");
    expect(className).not.toContain("transition-all");
  });

  it("leaves the editor's button as it was", () => {
    render(<ReuseButton onClick={vi.fn()} count={4} mode="editor" />);
    const { className } = screen.getByRole("button", { name: /rated history picker/i });

    expect(className).toContain("gap-2");
    expect(className).toContain("transition-all");
    expect(className).toContain("duration-200");
    expect(className).not.toContain("active:scale");
  });

  it("keeps the viewport rule in the editor", () => {
    render(<ReuseButton onClick={vi.fn()} count={4} mode="editor" />);

    expect(screen.getByText("Reuse").className).toContain("sm:inline");
  });
});
