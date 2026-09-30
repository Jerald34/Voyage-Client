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
});
