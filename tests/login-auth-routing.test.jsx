/**
 * login-auth-routing.test.jsx
 *
 * Tests for the stale-cache PENDING guard fix (Bug B).
 * This file is separate from login-page.test.jsx because that file cannot import
 * LoginPage — a pre-existing issue where app/components/icons/index.js uses JSX
 * in a .js file that Vite cannot parse. We mock the icons module here so the suite
 * can run.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../app/login/page.jsx";

// --- mocks -----------------------------------------------------------

// Mock the icons module — icons/index.js uses JSX in a .js file, which causes
// a pre-existing Vite parse error in all test files that import it transitively.
// We stub every export as a no-op component so the auth components render without icons.
vi.mock("../app/components/icons/index.js", () => {
  const stub = () => null;
  return {
    SearchIcon: stub, CloseIcon: stub, CheckIcon: stub, ReplyIcon: stub,
    ChatIcon: stub, MapPinIcon: stub, ArrowLeftIcon: stub, TrashIcon: stub,
    DownloadIcon: stub, ShareIcon: stub, SettingsIcon: stub, UserIcon: stub,
    MailIcon: stub, LockIcon: stub, ShieldIcon: stub, HomeIcon: stub,
    PhoneIcon: stub, GlobeIcon: stub, ChevronDownIcon: stub, EyeIcon: stub,
    EyeOffIcon: stub, BuildingIcon: stub, PlusIcon: stub, CalendarIcon: stub,
    StarIcon: stub, PlaneIcon: stub, HotelIcon: stub, ForkKnifeIcon: stub,
    CarIcon: stub, ListIcon: stub, MapIcon: stub, SparkleIcon: stub,
    UsersIcon: stub, UserGroupIcon: stub, ZapIcon: stub, CommentIcon: stub,
    BookmarkIcon: stub, LinkIcon: stub, RefreshIcon: stub, CheckCircleIcon: stub,
    ChevronLeftIcon: stub, ArrowRightIcon: stub, PresenterIcon: stub, SortIcon: stub,
  };
});

const useAuthState = {
  error: null,
  loading: false,
  register: vi.fn(),
  createAgency: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  startOAuth: vi.fn(),
  setError: vi.fn(),
};

// searchParamsMock lets individual tests set URL params without affecting others
const searchParamsMock = { step: null, mode: null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (key) => searchParamsMock[key] ?? null,
  }),
}));

vi.mock("../app/hooks/useAuth", () => ({
  useAuth: () => useAuthState,
}));

// --- setup -----------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  searchParamsMock.step = null;
  searchParamsMock.mode = null;
  useAuthState.error = null;
  useAuthState.loading = false;
  useAuthState.register.mockResolvedValue({ id: "user-1" });
  useAuthState.createAgency.mockResolvedValue({ id: "agency-1" });
});

// --- tests -----------------------------------------------------------

describe("login page — stale-cache PENDING guard (Bug B fix)", () => {
  it("(c) a stale PENDING localStorage entry does NOT force wizard mode without ?step=type", () => {
    // Simulate a user who abandoned a previous signup — stale PENDING left in storage
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-old", accountType: "PENDING", memberships: [] }),
    );
    // No step param — user navigated to /login directly
    searchParamsMock.step = null;

    render(<LoginPage />);

    // The login form must be shown, not the wizard
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    // Mode toggle must be visible (isAuthenticated=false)
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    // Must NOT be in the type-picker wizard
    expect(screen.queryByText("One quick choice")).not.toBeInTheDocument();
  });

  it("(c) stale PENDING localStorage + ?step=agency does NOT trigger the type picker", () => {
    // ?step=agency is the agency-wizard-resume path — must not activate type picker
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-old", accountType: "PENDING", memberships: [] }),
    );
    searchParamsMock.step = "agency";

    render(<LoginPage />);

    // Must NOT show "One quick choice" — that heading is only for the type picker
    expect(screen.queryByText("One quick choice")).not.toBeInTheDocument();
  });

  it("genuinely PENDING user redirected via ?step=type enters the type-picker wizard", () => {
    // page.jsx writes the fresh server PENDING user to localStorage then redirects
    // with ?step=type — login page should activate the type picker
    window.localStorage.setItem(
      "voyage-user",
      JSON.stringify({ id: "user-new", accountType: "PENDING", memberships: [] }),
    );
    searchParamsMock.step = "type";

    render(<LoginPage />);

    // Type-picker heading must appear
    expect(screen.getByText("One quick choice")).toBeInTheDocument();
  });

  it("?step=type with no stored user shows the login form (edge case: cleared storage)", () => {
    // If ?step=type arrives but localStorage was cleared, no wizard should show
    window.localStorage.clear();
    searchParamsMock.step = "type";

    render(<LoginPage />);

    // Falls back to the default login form
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("One quick choice")).not.toBeInTheDocument();
  });
});
