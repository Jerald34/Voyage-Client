import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/components/icons/index.js", () => ({
  CloseIcon: (p) => <svg {...p} />,
}));

import MasterDetailLayout from "../app/components/admin/MasterDetailLayout.jsx";

const baseProps = {
  list: <div>LIST</div>,
  detail: <div>DETAIL</div>,
  detailTitle: "T",
  onClose: () => {},
  emptyState: <div>EMPTY</div>,
};

describe("MasterDetailLayout", () => {
  it("shows the list and the empty state when closed", () => {
    render(<MasterDetailLayout {...baseProps} open={false} />);
    expect(screen.getByText("LIST")).toBeInTheDocument();
    expect(screen.getByText("EMPTY")).toBeInTheDocument();
    expect(screen.queryByText("DETAIL")).not.toBeInTheDocument();
  });

  it("shows the detail when open", () => {
    render(<MasterDetailLayout {...baseProps} open />);
    expect(screen.getByText("DETAIL")).toBeInTheDocument();
    expect(screen.queryByText("EMPTY")).not.toBeInTheDocument();
  });
});
