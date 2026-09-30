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
});
