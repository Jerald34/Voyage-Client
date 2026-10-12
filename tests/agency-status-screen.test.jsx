import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const support = vi.hoisted(() => ({ createProblemReport: vi.fn() }));
vi.mock("../app/lib/api/support.js", () => support);
vi.mock("../app/components/theme/ThemeToggle", () => ({ default: () => null }));

import AgencyStatusScreen from "../app/components/agency-status/AgencyStatusScreen.jsx";

const user = { email: "owner@hillside.test" };
const agency = (overrides = {}) => ({ id: "agency-1", name: "Hillside Travel", status: "PENDING_REVIEW", ...overrides });

beforeEach(() => {
  support.createProblemReport.mockReset();
  support.createProblemReport.mockResolvedValue({});
});

describe("AgencyStatusScreen", () => {
  it("tells a pending owner where the email will go and that the page updates itself", () => {
    render(<AgencyStatusScreen agency={agency()} user={user} onLogout={vi.fn()} />);

    expect(screen.getByText("owner@hillside.test", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/this page updates by itself/i)).toBeInTheDocument();
  });

  it("opens Report a problem, prefilled for the application, instead of an email link", async () => {
    render(<AgencyStatusScreen agency={agency()} user={user} onLogout={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Contact support" }));
    expect(screen.getByLabelText(/subject/i)).toHaveValue("Agency application: Hillside Travel");
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: "Any update?" } });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() =>
      expect(support.createProblemReport).toHaveBeenCalledWith(
        expect.objectContaining({ category: "OTHER", subject: "Agency application: Hillside Travel", message: "Any update?" }),
      ),
    );
    expect(await screen.findByText(/report sent/i)).toBeInTheDocument();
  });

  it("offers support, not a fake resubmit, to a rejected agency, and shows the reason", () => {
    render(
      <AgencyStatusScreen agency={agency({ status: "REJECTED", rejectionReason: "Business permit missing" })} user={user} onLogout={vi.fn()} />,
    );

    expect(screen.getByText(/Business permit missing/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resubmit/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contact support" })).toBeInTheDocument();
  });

  it("prefills a suspended agency's subject", () => {
    render(<AgencyStatusScreen agency={agency({ status: "SUSPENDED" })} user={user} onLogout={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Contact support" }));
    expect(screen.getByLabelText(/subject/i)).toHaveValue("Suspended agency: Hillside Travel");
  });

  it("starts a fresh report each time the dialog is reopened and returns focus to the button", async () => {
    render(<AgencyStatusScreen agency={agency()} user={user} onLogout={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Contact support" });

    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: "Draft text" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByLabelText(/details/i)).toHaveValue("");
  });
});
