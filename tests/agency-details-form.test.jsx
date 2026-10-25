// tests/agency-details-form.test.jsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgencyDetailsForm from "../app/components/settings/AgencyDetailsForm.jsx";

const agency = {
  id: "agency-1",
  name: "Voyage Travel Studio",
  status: "VERIFIED",
  businessPhone: "639001112222",
  businessEmail: "hello@voyage.example",
  city: "Olongapo City",
  country: "Philippines",
};

function renderForm(props = {}) {
  return render(
    <AgencyDetailsForm agency={agency} membership={{ role: "OWNER", status: "ACTIVE" }} onUpdateAgency={vi.fn()} {...props} />,
  );
}

describe("AgencyDetailsForm", () => {
  it("normalizes saved workspace fields after a successful agency update", async () => {
    const onUpdateAgency = vi.fn(async () => ({ agency: { ...agency, name: "Voyage Travel Co" } }));
    renderForm({ onUpdateAgency });

    fireEvent.change(screen.getByLabelText("Agency name"), { target: { value: "  Voyage Travel Co  " } });
    fireEvent.change(screen.getByLabelText("Business phone"), { target: { value: "  +63 900 111 2222  " } });
    fireEvent.change(screen.getByLabelText("Business email"), { target: { value: "  hello@voyage.example  " } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "  Olongapo City  " } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "  Philippines  " } });

    expect(screen.getByRole("button", { name: "Save workspace changes" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save workspace changes" }));

    await waitFor(() => {
      expect(onUpdateAgency).toHaveBeenCalledWith({
        name: "Voyage Travel Co",
        businessPhone: "639001112222",
        businessEmail: "hello@voyage.example",
        city: "Olongapo City",
        country: "Philippines",
      });
    });
    expect(screen.getByLabelText("Agency name")).toHaveValue("Voyage Travel Co");
    expect(screen.getByLabelText("Business phone")).toHaveValue("639001112222");
    expect(screen.getByRole("button", { name: "Save workspace changes" })).toBeDisabled();
  });

  it("refuses to save without a business phone", async () => {
    const onUpdateAgency = vi.fn();
    renderForm({ onUpdateAgency });

    fireEvent.change(screen.getByLabelText("Business phone"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save workspace changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Business phone is required.");
    expect(onUpdateAgency).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "STAFF"])("is read-only for %s members", (role) => {
    renderForm({ membership: { role, status: "ACTIVE" } });

    expect(screen.getByText("Only the agency owner can edit workspace details.")).toBeInTheDocument();
    expect(screen.getByLabelText("Agency name")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Save workspace changes" })).toBeDisabled();
  });

  it("shows the agency status pill", () => {
    renderForm();
    expect(screen.getByText("Agency status")).toBeInTheDocument();
    expect(screen.getByText("VERIFIED")).toBeInTheDocument();
  });
});
