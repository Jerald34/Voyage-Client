import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlaceStatusBadge from "../app/components/trip-dashboard/itinerary/PlaceStatusBadge.jsx";
import PlaceAdvisoryNotice from "../app/components/trip-dashboard/itinerary/PlaceAdvisoryNotice.jsx";

describe("PlaceStatusBadge", () => {
  it("uses readable closure text", () => {
    render(<PlaceStatusBadge businessStatus="CLOSED_PERMANENTLY" />);
    expect(screen.getByText("Permanently closed")).toBeVisible();
  });

  it("does not claim missing status is open", () => {
    const { container } = render(<PlaceStatusBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an operational place", () => {
    const { container } = render(<PlaceStatusBadge businessStatus="OPERATIONAL" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("distinguishes a temporary closure", () => {
    render(<PlaceStatusBadge businessStatus="CLOSED_TEMPORARILY" />);
    expect(screen.getByText("Temporarily closed")).toBeVisible();
  });

  it("prefers the agency label over the provider's", () => {
    render(
      <PlaceStatusBadge
        businessStatus="CLOSED_PERMANENTLY"
        placeAdvisory={{ reason: "AGENCY_AVOID", label: "Agency recommends avoiding" }}
      />
    );
    expect(screen.getByText("Agency recommends avoiding")).toBeVisible();
    expect(screen.queryByText("Permanently closed")).toBeNull();
  });

  it("is announced as a status rather than silently decorative", () => {
    render(<PlaceStatusBadge businessStatus="CLOSED_PERMANENTLY" />);
    const badge = screen.getByText("Permanently closed");
    expect(badge).toHaveAttribute("role", "status");
  });
});

describe("PlaceAdvisoryNotice", () => {
  const notesUnavailable = [
    {
      reason: "NOTES_UNAVAILABLE",
      label: "Agency restrictions could not be checked. Review these places before confirming the trip."
    }
  ];

  it("warns when agency restrictions could not be checked", () => {
    render(<PlaceAdvisoryNotice advisories={notesUnavailable} />);
    expect(screen.getByRole("status")).toHaveTextContent(/could not be checked/i);
  });

  it("disappears once notes load successfully on a later read", () => {
    const { rerender, container } = render(<PlaceAdvisoryNotice advisories={notesUnavailable} />);
    expect(screen.getByRole("status")).toBeVisible();

    rerender(<PlaceAdvisoryNotice advisories={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the field is absent, as on a public share", () => {
    const { container } = render(<PlaceAdvisoryNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
