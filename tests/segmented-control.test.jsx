import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SegmentedControl from "../app/components/admin/SegmentedControl.jsx";

const opts = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];

describe("SegmentedControl", () => {
  it("renders tabs and marks the active one selected", () => {
    render(<SegmentedControl options={opts} value="a" onChange={() => {}} ariaLabel="x" />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the option value when clicked", () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={opts} value="a" onChange={onChange} ariaLabel="x" />);
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("supports radio semantics with aria-checked", () => {
    render(<SegmentedControl as="radio" options={opts} value="b" onChange={() => {}} ariaLabel="x" />);
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
  });

  it("renders a badge when provided", () => {
    render(<SegmentedControl options={[{ value: "a", label: "Alpha", badge: 3 }]} value="a" onChange={() => {}} ariaLabel="x" />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
