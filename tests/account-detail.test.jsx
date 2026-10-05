import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({
  fetchAccountDetail: vi.fn(),
}));

import { fetchAccountDetail } from "../app/lib/api/index.js";
import AccountDetail from "../app/components/admin/AccountDetail.jsx";

const membership = (over = {}) => ({
  agencyId: "ag1",
  agencyName: "Alpha Travel",
  agencyStatus: "VERIFIED",
  role: "OWNER",
  status: "ACTIVE",
  ...over,
});

const detail = (over = {}) => ({
  id: "u2",
  email: "ana@alpha.com",
  displayName: "Ana Reyes",
  role: "USER",
  status: "ACTIVE",
  accountType: "AGENCY_USER",
  emailVerified: true,
  emailVerifiedAt: "2026-04-11T12:00:00.000Z",
  createdAt: "2026-04-10T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  signInMethods: ["PASSWORD", "GOOGLE"],
  memberships: [membership(), membership({ agencyId: "ag2", agencyName: "Beta Tours", agencyStatus: "PENDING_REVIEW", role: "STAFF" })],
  activity: { itineraries: 12, clientTrips: 3, agentThreads: 41 },
  ...over,
});

async function renderDetail(account = detail(), userId = "u2") {
  fetchAccountDetail.mockResolvedValue({ user: account });
  render(<AccountDetail userId={userId} />);
  await screen.findByText("Email");
}

// The text of whatever sits beside a field label (<dt> -> <dd>).
const valueOf = (label) => screen.getByText(label).nextElementSibling;

beforeEach(() => {
  fetchAccountDetail.mockReset();
});

describe("AccountDetail", () => {
  describe("loading and failure", () => {
    it("asks for the account by id and shows a loading state first", async () => {
      let resolve;
      fetchAccountDetail.mockReturnValue(new Promise((r) => (resolve = r)));
      render(<AccountDetail userId="u2" />);
      expect(screen.getByText("Loading account details…")).toBeInTheDocument();
      expect(fetchAccountDetail).toHaveBeenCalledWith("u2");

      resolve({ user: detail() });
      expect(await screen.findByText("ana@alpha.com")).toBeInTheDocument();
      expect(screen.queryByText("Loading account details…")).not.toBeInTheDocument();
    });

    it("shows the error and nothing else when the account cannot be loaded", async () => {
      fetchAccountDetail.mockRejectedValue(new Error("Account not found."));
      render(<AccountDetail userId="missing" />);
      expect(await screen.findByText("Account not found.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Account not found.");
      expect(screen.queryByText("Email")).not.toBeInTheDocument();
      expect(screen.queryByText("Loading account details…")).not.toBeInTheDocument();
    });

    it("loads the new account when the id changes, ignoring a slower earlier response", async () => {
      let resolveFirst;
      fetchAccountDetail.mockImplementation((id) =>
        id === "u1"
          ? new Promise((r) => (resolveFirst = r))
          : Promise.resolve({ user: detail({ id: "u2", email: "second@example.com" }) })
      );
      const { rerender } = render(<AccountDetail userId="u1" />);
      rerender(<AccountDetail userId="u2" />);
      expect(await screen.findByText("second@example.com")).toBeInTheDocument();

      await act(async () => {
        resolveFirst({ user: detail({ id: "u1", email: "first@example.com" }) });
      });
      expect(fetchAccountDetail).toHaveBeenCalledTimes(2);
      expect(screen.getByText("second@example.com")).toBeInTheDocument();
      expect(screen.queryByText("first@example.com")).not.toBeInTheDocument();
    });
  });

  describe("badges", () => {
    it("shows the account type and status", async () => {
      await renderDetail();
      expect(screen.getByText("Agency")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.queryByText("Super admin")).not.toBeInTheDocument();
    });

    it("shows a personal account as Personal and a disabled one as Disabled", async () => {
      await renderDetail(detail({ accountType: "PERSONAL", status: "DISABLED", memberships: [] }));
      expect(screen.getByText("Personal")).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("shows a setup-incomplete account as Setup incomplete", async () => {
      await renderDetail(detail({ accountType: "PENDING", memberships: [] }));
      expect(screen.getByText("Setup incomplete")).toBeInTheDocument();
    });

    it("adds the Super admin chip for a super admin", async () => {
      await renderDetail(detail({ role: "SUPER_ADMIN" }));
      expect(screen.getByText("Super admin")).toBeInTheDocument();
    });
  });

  describe("fields", () => {
    it("shows email, verification date, sign-in methods and join date", async () => {
      await renderDetail();
      expect(valueOf("Email")).toHaveTextContent("ana@alpha.com");
      expect(valueOf("Email verified")).toHaveTextContent("Apr 11, 2026");
      expect(valueOf("Sign-in methods")).toHaveTextContent("Email & password, Google");
      expect(valueOf("Joined")).toHaveTextContent("Apr 10, 2026");
    });

    it("says Not verified when the email has not been confirmed", async () => {
      await renderDetail(detail({ emailVerified: false, emailVerifiedAt: null }));
      expect(valueOf("Email verified")).toHaveTextContent("Not verified");
    });

    it("names each sign-in method in plain words", async () => {
      await renderDetail(detail({ signInMethods: ["GOOGLE"] }));
      expect(valueOf("Sign-in methods")).toHaveTextContent(/^Google$/);
    });

    it("lists Apple, and falls back to the raw name for a method it does not know", async () => {
      await renderDetail(detail({ signInMethods: ["APPLE", "PASSKEY"] }));
      expect(valueOf("Sign-in methods")).toHaveTextContent("Apple, PASSKEY");
    });

    it("shows a dash when the account has no sign-in method", async () => {
      await renderDetail(detail({ signInMethods: [] }));
      expect(valueOf("Sign-in methods")).toHaveTextContent("—");
    });
  });

  describe("agencies", () => {
    it("lists every membership with the agency's status and the member's role", async () => {
      await renderDetail();
      expect(screen.getByRole("heading", { name: "Agencies" })).toBeInTheDocument();

      const alpha = within(screen.getByText("Alpha Travel").closest("li"));
      expect(alpha.getByText("Approved")).toBeInTheDocument();
      expect(alpha.getByText("Owner")).toBeInTheDocument();

      const beta = within(screen.getByText("Beta Tours").closest("li"));
      expect(beta.getByText("Pending")).toBeInTheDocument();
      expect(beta.getByText("Staff")).toBeInTheDocument();
    });

    it("flags a disabled membership, and only that one", async () => {
      await renderDetail(
        detail({
          memberships: [membership(), membership({ agencyId: "ag2", agencyName: "Beta Tours", role: "ADMIN", status: "DISABLED" })],
        })
      );
      expect(screen.getAllByText("Membership disabled")).toHaveLength(1);
      expect(within(screen.getByText("Beta Tours").closest("li")).getByText("Membership disabled")).toBeInTheDocument();
      expect(within(screen.getByText("Alpha Travel").closest("li")).queryByText("Membership disabled")).not.toBeInTheDocument();
    });

    it("says so when the account belongs to no agency", async () => {
      await renderDetail(detail({ accountType: "PERSONAL", memberships: [] }));
      expect(screen.getByText("Not a member of any agency.")).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("activity", () => {
    it("counts itineraries, client trips and agent chats the account created", async () => {
      await renderDetail();
      expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
      expect(valueOf("Itineraries")).toHaveTextContent("12");
      expect(valueOf("Client trips")).toHaveTextContent("3");
      expect(valueOf("Agent chats")).toHaveTextContent("41");
    });

    it("shows zeros rather than hiding the section", async () => {
      await renderDetail(detail({ activity: { itineraries: 0, clientTrips: 0, agentThreads: 0 } }));
      expect(valueOf("Itineraries")).toHaveTextContent("0");
      expect(valueOf("Agent chats")).toHaveTextContent("0");
    });
  });

  describe("read-only", () => {
    it("offers no actions: not one button, link or form control", async () => {
      await renderDetail();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });
  });

  describe("typography", () => {
    it("sets section headings in the sans label style, not the default serif h3", async () => {
      await renderDetail();
      for (const name of ["Agencies", "Activity"]) {
        const h = screen.getByRole("heading", { name });
        expect(h.tagName).toBe("H3");
        expect(h.className).toContain("font-sans");
        expect(h.className).toContain("uppercase");
        expect(h.className).toContain("tracking-wider");
      }
    });
  });
});
