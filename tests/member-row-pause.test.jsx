import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MemberRow from "../app/components/team/MemberRow.jsx";

const member = (over = {}) => ({
  id: "m2",
  role: "STAFF",
  createdAt: "2026-09-01T00:00:00.000Z",
  user: { id: "u2", email: "mara@hops.travel", displayName: "Mara Santos" },
  agentPause: null,
  ...over,
});

// Local clock, any time zone: a mid-month midday far in the future is Jun 15 or 16 everywhere.
const TIMED = { until: "2099-06-15T12:00:00.000Z", reason: "Testing the limits" };

describe("MemberRow agent pause", () => {
  it("shows a paused badge with the reason", () => {
    render(<MemberRow member={member({ agentPause: { until: null, reason: "Unusually high usage" } })} viewerRole="OWNER" />);
    expect(screen.getByText("Agent paused")).toBeInTheDocument();
    expect(screen.getByText("Unusually high usage")).toBeInTheDocument();
  });

  it("shows nothing extra when not paused", () => {
    render(<MemberRow member={member()} viewerRole="OWNER" />);
    expect(screen.queryByText(/Agent paused/)).not.toBeInTheDocument();
  });

  it("says when a timed pause ends", () => {
    render(<MemberRow member={member({ agentPause: TIMED })} viewerRole="ADMIN" />);
    expect(screen.getByText(/^Agent paused until Jun 1[56]/)).toBeInTheDocument();
    expect(screen.getByText("Testing the limits")).toBeInTheDocument();
  });

  it("puts the reason in the page text under the email, not in a tooltip", () => {
    render(<MemberRow member={member({ agentPause: TIMED })} viewerRole="OWNER" />);
    const reason = screen.getByText("Testing the limits");
    // Plain text a touch or screen-reader user reaches without hovering.
    expect(reason).not.toHaveAttribute("title");
    expect(reason.closest("[title]")).toBeNull();
    const column = screen.getByText("mara@hops.travel").parentElement;
    expect(column).toContainElement(reason);
    expect(column).toContainElement(screen.getByText(/^Agent paused until/));
  });

  it("leaves out the reason line when there is none", () => {
    render(<MemberRow member={member({ agentPause: { until: null, reason: "" } })} viewerRole="OWNER" />);
    const badge = screen.getByText("Agent paused");
    expect(badge.parentElement.children).toHaveLength(1);
  });

  it("says nothing for a pause that has already ended", () => {
    render(<MemberRow member={member({ agentPause: { until: "2026-01-02T00:00:00.000Z", reason: "Old" } })} viewerRole="OWNER" />);
    expect(screen.queryByText(/Agent paused/)).not.toBeInTheDocument();
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
  });

  it("shows nothing when the server sends no pause field (a staff viewer)", () => {
    const { agentPause, ...rest } = member();
    render(<MemberRow member={rest} viewerRole="STAFF" />);
    expect(screen.queryByText(/Agent paused/)).not.toBeInTheDocument();
  });

  it("keeps the member actions menu working beside the badge", () => {
    render(<MemberRow member={member({ agentPause: { until: null, reason: "r" } })} viewerRole="OWNER" />);
    expect(screen.getByRole("button", { name: "Member actions" })).toBeInTheDocument();
  });
});
