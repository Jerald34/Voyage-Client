import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/index.js", () => ({
  fetchAccountDetail: vi.fn(),
  adminDisableUser: vi.fn(),
  adminEnableUser: vi.fn(),
  adminSignOutUser: vi.fn(),
  adminDeleteUser: vi.fn(),
}));
// The dialogs have their own tests; here they are stubs that expose the callbacks the panel wires up.
vi.mock("../app/components/admin/AccountActionDialog.jsx", () => ({
  default: ({ open, action, onDone }) =>
    open ? (
      <div role="dialog" aria-label={`action ${action}`}>
        <button
          type="button"
          onClick={() =>
            onDone(action === "sign-out" ? null : {
              id: "u2",
              email: "ana@alpha.com",
              displayName: "Ana Reyes",
              role: "USER",
              status: "DISABLED",
              accountType: "AGENCY_USER",
              memberships: [],
              signInMethods: [],
              activity: {},
              auditEvents: [{ id: "e9", action: "USER_DISABLED", reason: null, createdAt: "2026-10-20T00:00:00.000Z", adminName: "Jerald" }],
            })
          }
        >
          stub finish action
        </button>
      </div>
    ) : null,
}));
vi.mock("../app/components/admin/DeleteAccountDialog.jsx", () => ({
  default: ({ open, onDeleted, onDisableInstead }) =>
    open ? (
      <div role="dialog" aria-label="delete">
        <button type="button" onClick={onDeleted}>
          stub finish delete
        </button>
        {onDisableInstead && (
          <button type="button" onClick={onDisableInstead}>
            stub disable instead
          </button>
        )}
      </div>
    ) : null,
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
  auditEvents: [],
  ownedAgencies: [],
  ...over,
});

async function renderDetail(account = detail(), props = {}, userId = "u2") {
  fetchAccountDetail.mockResolvedValue({ user: account });
  render(<AccountDetail userId={userId} {...props} />);
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

  describe("read-only parts", () => {
    it("has no links or text fields", async () => {
      await renderDetail();
      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });

    it("has no buttons at all for a super admin account", async () => {
      await renderDetail(detail({ role: "SUPER_ADMIN" }));
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });
  });

  describe("account actions", () => {
    it("opens a dialog for Sign out everywhere, Disable and Delete on an active user", async () => {
      await renderDetail();
      fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
      expect(screen.getByRole("dialog", { name: "action sign-out" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      expect(screen.getByRole("dialog", { name: "action disable" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(screen.getByRole("dialog", { name: "delete" })).toBeInTheDocument();
    });

    it("offers Enable instead of Disable for a disabled user", async () => {
      await renderDetail(detail({ status: "DISABLED" }));
      expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Enable" }));
      expect(screen.getByRole("dialog", { name: "action enable" })).toBeInTheDocument();
    });

    it("has no actions for a super admin", async () => {
      await renderDetail(detail({ role: "SUPER_ADMIN" }));
      expect(screen.queryByRole("button", { name: "Delete account" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sign out everywhere" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    });

    it("has no actions for a deleted account", async () => {
      await renderDetail(detail({ status: "DELETED" }));
      expect(screen.getByText("Deleted")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete account" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sign out everywhere" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    });

    it("applies the refreshed account after an action, closes the dialog and tells the list", async () => {
      const onChanged = vi.fn();
      await renderDetail(detail(), { onChanged });
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
      fireEvent.click(screen.getByRole("button", { name: "stub finish action" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onChanged).toHaveBeenCalledTimes(1);
      // The status pill, the swapped button and the new audit line all come from the refreshed account.
      expect(screen.getAllByText("Disabled")).toHaveLength(2); // the pill and the audit entry
      expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
      expect(screen.getByText(/by Jerald on Oct 20, 2026/)).toBeInTheDocument();
    });

    it("keeps showing the current account when an action returns no account", async () => {
      // The stub resolves the sign-out action with null (no refreshed account in the response).
      const onChanged = vi.fn();
      await renderDetail(detail(), { onChanged });
      fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
      fireEvent.click(screen.getByRole("button", { name: "stub finish action" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(valueOf("Email")).toHaveTextContent("ana@alpha.com");
      expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalledTimes(1);
    });

    it("closes the dialog and tells the list when the account is deleted", async () => {
      const onDeleted = vi.fn();
      await renderDetail(detail(), { onDeleted });
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      fireEvent.click(screen.getByRole("button", { name: "stub finish delete" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    it("moves from the delete dialog to the disable dialog on Disable instead", async () => {
      await renderDetail();
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      fireEvent.click(screen.getByRole("button", { name: "stub disable instead" }));

      expect(screen.queryByRole("dialog", { name: "delete" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "action disable" })).toBeInTheDocument();
    });

    it("does not offer Disable instead when the account is already disabled", async () => {
      await renderDetail(detail({ status: "DISABLED" }));
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      expect(screen.getByRole("dialog", { name: "delete" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "stub disable instead" })).not.toBeInTheDocument();
    });
  });

  describe("audit trail", () => {
    const event = { id: "e1", action: "USER_DISABLED", reason: "left the agency", createdAt: "2026-10-18T00:00:00.000Z", adminName: "Jerald" };

    it("lists each event with the admin, the date and the reason", async () => {
      await renderDetail(detail({ auditEvents: [event] }));
      expect(screen.getByRole("heading", { name: "Audit trail" })).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
      expect(screen.getByText(/by Jerald on Oct 18, 2026/)).toBeInTheDocument();
      expect(screen.getByText("left the agency")).toBeInTheDocument();
    });

    it("leaves out the reason line when there is none, and shows an unknown action as-is", async () => {
      await renderDetail(detail({ auditEvents: [{ ...event, id: "e2", action: "USER_TELEPORTED", reason: null }] }));
      expect(screen.getByText("USER_TELEPORTED")).toBeInTheDocument();
      expect(screen.queryByText("left the agency")).not.toBeInTheDocument();
    });

    it("is not shown at all when the account has no events", async () => {
      await renderDetail();
      expect(screen.queryByText("Audit trail")).not.toBeInTheDocument();
    });

    it("is still shown for a deleted account", async () => {
      await renderDetail(detail({ status: "DELETED", auditEvents: [{ ...event, id: "e3", action: "USER_DELETED", reason: null }] }));
      expect(screen.getByRole("heading", { name: "Audit trail" })).toBeInTheDocument();
    });
  });

  describe("typography", () => {
    it("sets section headings in the sans label style, not the default serif h3", async () => {
      await renderDetail(detail({ auditEvents: [{ id: "e1", action: "USER_ENABLED", reason: null, createdAt: "2026-10-18T00:00:00.000Z", adminName: "Jerald" }] }));
      for (const name of ["Agencies", "Activity", "Audit trail"]) {
        const h = screen.getByRole("heading", { name });
        expect(h.tagName).toBe("H3");
        expect(h.className).toContain("font-sans");
        expect(h.className).toContain("uppercase");
        expect(h.className).toContain("tracking-wider");
      }
    });
  });
});
