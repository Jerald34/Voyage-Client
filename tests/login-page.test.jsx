import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../app/login/page.jsx";

const useAuthState = {
  error: null,
  loading: false,
  register: vi.fn(),
  createAgency: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  startOAuth: vi.fn(),
  setError: vi.fn()
};

// searchParamsMock lets individual tests override URL params without
// breaking the existing suite (defaults return null for all keys).
const searchParamsMock = { step: null, mode: null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (key) => searchParamsMock[key] ?? null
  })
}));

vi.mock("../app/hooks/useAuth", () => ({
  useAuth: () => useAuthState
}));

beforeEach(() => {
  useAuthState.error = null;
  useAuthState.loading = false;
  useAuthState.register.mockReset();
  useAuthState.createAgency.mockReset();
  useAuthState.login.mockReset();
  useAuthState.logout.mockReset();
  useAuthState.startOAuth.mockReset();
  useAuthState.setError.mockReset();
  useAuthState.register.mockResolvedValue({ id: "user-1" });
  useAuthState.createAgency.mockResolvedValue({ id: "agency-1" });
  // Reset search params to defaults so existing tests are unaffected
  searchParamsMock.step = null;
  searchParamsMock.mode = null;
  window.localStorage.clear();
});

async function reachAgencyStep() {
  render(<LoginPage />);

  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  fireEvent.change(await screen.findByLabelText("Full name"), { target: { value: "New User" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new-user@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password123" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Next: Agency Details" }));

  await screen.findByRole("heading", { name: "Your agency" });
}

describe("login page register validation", () => {
  it("shows a field-level password error when the password matches the display name", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const fullNameField = await screen.findByLabelText("Full name");
    const emailField = screen.getByLabelText("Email address");
    const passwordField = screen.getByLabelText("Password");
    const confirmPasswordField = screen.getByLabelText("Confirm password");

    fireEvent.change(fullNameField, { target: { value: "New User" } });
    fireEvent.change(emailField, { target: { value: "new-user@example.com" } });
    fireEvent.change(passwordField, { target: { value: "New User" } });
    fireEvent.change(confirmPasswordField, { target: { value: "New User" } });
    fireEvent.click(screen.getByLabelText(/terms of service/i));

    fireEvent.click(screen.getByRole("button", { name: "Next: Agency Details" }));

    expect(screen.getByText("Password must be different from your name and email.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next: Agency Details" })).toBeInTheDocument();
  });

  it("requires every agency field before submitting the second step", async () => {
    await reachAgencyStep();

    fireEvent.click(screen.getByRole("button", { name: "Create my agency" }));

    expect(screen.getByText("Agency name is required")).toBeInTheDocument();
    expect(screen.getByText("Business phone is required")).toBeInTheDocument();
    expect(screen.getByText("Business email is required")).toBeInTheDocument();
    expect(screen.getByText("Country is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(useAuthState.createAgency).not.toHaveBeenCalled();
  });

  it("strips non-digit characters from the business phone before submitting registration", async () => {
    await reachAgencyStep();

    fireEvent.change(screen.getByLabelText(/agency name/i), { target: { value: "Voyage Travel Co" } });
    fireEvent.change(screen.getByLabelText(/business phone/i), { target: { value: "+63 900 111 2222" } });
    fireEvent.change(screen.getByLabelText(/business email/i), { target: { value: "hello@voyage.example" } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: "Philippines" } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: "Olongapo City" } });

    expect(screen.getByLabelText(/business phone/i)).toHaveValue("639001112222");

    fireEvent.click(screen.getByRole("button", { name: "Create my agency" }));

    await waitFor(() => {
      expect(useAuthState.createAgency).toHaveBeenCalledWith(
        expect.objectContaining({
          businessPhone: "639001112222"
        })
      );
    });
  });

  it("filters the city list by the selected country and clears the city when country changes", async () => {
    await reachAgencyStep();

    const countrySelect = screen.getByLabelText(/country/i);
    const citySelect = screen.getByLabelText(/city/i);

    expect(citySelect).toBeDisabled();

    fireEvent.change(countrySelect, { target: { value: "Japan" } });

    expect(citySelect).not.toBeDisabled();
    expect(Array.from(citySelect.options).map((option) => option.value)).toContain("Tokyo");
    expect(Array.from(citySelect.options).map((option) => option.value)).not.toContain("Manila");

    fireEvent.change(citySelect, { target: { value: "Tokyo" } });
    expect(citySelect).toHaveValue("Tokyo");

    fireEvent.change(countrySelect, { target: { value: "Philippines" } });
    expect(citySelect).toHaveValue("");
  });
});

describe("login page — stale-cache PENDING guard (Bug B fix)", () => {
  it("(c) a stale PENDING localStorage entry does NOT force wizard mode when there is no ?step=type param", () => {
    // Simulate a user who abandoned a previous signup — PENDING is left in storage
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-old", accountType: "PENDING", memberships: [] }),
    );
    // No ?step param — this is a fresh /login visit
    searchParamsMock.step = null;

    render(<LoginPage />);

    // The Sign-in form must be shown, NOT the wizard
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    // The login/register mode toggle must be visible (isAuthenticated=false)
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    // Should NOT be in register/wizard mode
    expect(screen.queryByText("One quick choice")).not.toBeInTheDocument();
  });

  it("(c) stale PENDING localStorage + ?step=agency does NOT trigger the type picker", () => {
    // ?step=agency is for agency wizard resume — should go to wizard step 2, not type
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-old", accountType: "PENDING", memberships: [] }),
    );
    searchParamsMock.step = "agency";

    render(<LoginPage />);

    // Should NOT show "One quick choice" (the type picker heading)
    expect(screen.queryByText("One quick choice")).not.toBeInTheDocument();
  });

  it("genuinely PENDING user redirected via ?step=type enters the type-picker wizard", () => {
    // page.jsx sets localStorage to the fresh server response then redirects with ?step=type
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-new", accountType: "PENDING", memberships: [] }),
    );
    searchParamsMock.step = "type";

    render(<LoginPage />);

    // The type-picker heading must be visible
    expect(screen.getByText("One quick choice")).toBeInTheDocument();
  });
});
