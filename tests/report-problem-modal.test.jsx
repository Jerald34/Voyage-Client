import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReportProblemModal from "../app/components/settings/ReportProblemModal.jsx";

describe("ReportProblemModal", () => {
  it("blocks submit until subject and message are filled", () => {
    const onSubmit = vi.fn();
    render(<ReportProblemModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
  });

  it("submits the report payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(<ReportProblemModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Crash" } });
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: "It broke" } });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ subject: "Crash", message: "It broke" })));
  });

  it("shows validation errors in the theme's danger colour", () => {
    render(<ReportProblemModal open onClose={() => {}} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("text-status-danger");
    expect(alert.className).not.toContain("text-red-400");
  });

  it("starts from the category and subject it is given", () => {
    render(
      <ReportProblemModal
        open
        onClose={() => {}}
        onSubmit={vi.fn()}
        initialCategory="OTHER"
        initialSubject="Agency application: Hillside Travel"
      />,
    );
    expect(screen.getByLabelText(/category/i)).toHaveValue("OTHER");
    expect(screen.getByLabelText(/subject/i)).toHaveValue("Agency application: Hillside Travel");
  });

  it("ignores Cancel and backdrop clicks while a send is in flight, and keeps the failure visible", async () => {
    let rejectSend;
    const onSubmit = vi.fn(() => new Promise((_, reject) => { rejectSend = reject; }));
    const onClose = vi.fn();
    const { container } = render(<ReportProblemModal open onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Crash" } });
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: "It broke" } });
    fireEvent.click(screen.getByRole("button", { name: /send report/i }));
    await screen.findByRole("button", { name: /sending/i });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(container.querySelector('[aria-hidden="true"]'));
    expect(onClose).not.toHaveBeenCalled();

    rejectSend(new Error("Server said no"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server said no");
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("limits the subject to the server's 150 characters", () => {
    render(<ReportProblemModal open onClose={() => {}} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/subject/i)).toHaveAttribute("maxlength", "150");
  });
});
