import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
// A Proxy stubs whichever icon a component imports, so adding an icon to a view cannot break this suite.
vi.mock("../app/components/icons/index.js", () => {
  const Icon = () => null;
  const isIconName = (name) => typeof name === "string" && name !== "then";
  return new Proxy(
    { __esModule: true },
    {
      // vitest 4 also checks `name in mock` before reading it, so the Proxy needs a `has` trap too.
      has: (target, name) => name in target || isIconName(name),
      get: (target, name) => (name in target ? target[name] : isIconName(name) ? Icon : undefined),
    },
  );
});

const authState = vi.hoisted(() => ({
  login: vi.fn(),
  startOAuth: vi.fn(),
  resendVerificationEmail: vi.fn(),
  error: null,
  loading: false,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../app/hooks/useAuth", () => ({
  useAuth: () => authState,
  setPendingInviteToken: vi.fn(),
}));

import LoginForm from "../app/components/auth/LoginForm.jsx";

beforeEach(() => {
  authState.login.mockReset();
  authState.startOAuth.mockReset();
  authState.resendVerificationEmail.mockReset();
  authState.error = null;
  authState.loading = false;
});

describe("login form — keep me signed in", () => {
  function fillCredentials() {
    fireEvent.change(screen.getByPlaceholderText("voyager@example.com"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), { target: { value: "password123" } });
  }

  it("is ticked by default and sends rememberMe: true", () => {
    render(<LoginForm />);

    expect(screen.getByRole("checkbox", { name: /keep me signed in/i })).toBeChecked();
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to Voyage" }));

    expect(authState.login).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password123",
      rememberMe: true,
    });
  });

  it("sends rememberMe: false once unticked", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("checkbox", { name: /keep me signed in/i }));
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to Voyage" }));

    expect(authState.login).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password123",
      rememberMe: false,
    });
  });

  it("passes the choice to Google sign-in", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("checkbox", { name: /keep me signed in/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(authState.startOAuth).toHaveBeenCalledWith("google", { rememberMe: false });
  });
});
