// tests/admin-account-actions-api.test.js
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/client.js", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchApi: vi.fn(async () => ({})),
}));

import { fetchApi, createApiError } from "../app/lib/api/client.js";
import { adminDeleteUser, adminDisableUser, adminEnableUser, adminPauseAgent, adminResumeAgent, adminSignOutUser } from "../app/lib/api/admin.js";
import * as api from "../app/lib/api/index.js";

beforeEach(() => fetchApi.mockClear());

const bodyOf = (call) => JSON.parse(call[1].body);

describe("admin account action calls", () => {
  it("disable / enable / sign out POST with an optional reason", async () => {
    await adminDisableUser("u1", "spam");
    await adminEnableUser("u1");
    await adminSignOutUser("u1", "");

    expect(fetchApi.mock.calls.map((c) => [c[0], c[1].method, bodyOf(c)])).toEqual([
      ["/admin/users/u1/disable", "POST", { reason: "spam" }],
      ["/admin/users/u1/enable", "POST", {}],
      ["/admin/users/u1/sign-out", "POST", {}],
    ]);
  });

  it("delete sends the confirmation and only the fields that are set", async () => {
    await adminDeleteUser("u1", { confirmEmail: "a@b.com", reason: "", newOwnerUserId: "u2" });
    expect(fetchApi.mock.calls[0][0]).toBe("/admin/users/u1/delete");
    expect(bodyOf(fetchApi.mock.calls[0])).toEqual({ confirmEmail: "a@b.com", newOwnerUserId: "u2" });
  });
});

describe("agent pause calls", () => {
  it("pause POSTs the duration and a trimmed reason", async () => {
    await adminPauseAgent("u1", { duration: "7d", reason: "  Unusually high usage  " });
    expect(fetchApi.mock.calls[0][0]).toBe("/admin/users/u1/agent-pause");
    expect(fetchApi.mock.calls[0][1].method).toBe("POST");
    expect(bodyOf(fetchApi.mock.calls[0])).toEqual({ duration: "7d", reason: "Unusually high usage" });
  });

  it("pause sends an empty string, not undefined, when no reason was typed", async () => {
    await adminPauseAgent("u1", { duration: "indefinite" });
    expect(bodyOf(fetchApi.mock.calls[0])).toEqual({ duration: "indefinite", reason: "" });
  });

  it("resume POSTs an empty body when no reason was given", async () => {
    await adminResumeAgent("u1");
    await adminResumeAgent("u1", "   ");
    expect(fetchApi.mock.calls[0][0]).toBe("/admin/users/u1/agent-resume");
    expect(fetchApi.mock.calls[0][1].method).toBe("POST");
    expect(bodyOf(fetchApi.mock.calls[0])).toEqual({});
    expect(bodyOf(fetchApi.mock.calls[1])).toEqual({});
  });

  it("resume sends the optional reason, trimmed, for the audit trail", async () => {
    await adminResumeAgent("u1", "  Cleared after review  ");
    expect(bodyOf(fetchApi.mock.calls[0])).toEqual({ reason: "Cleared after review" });
  });

  it("both are exported from the api barrel", () => {
    expect(api.adminPauseAgent).toBe(adminPauseAgent);
    expect(api.adminResumeAgent).toBe(adminResumeAgent);
  });
});

describe("createApiError", () => {
  it("keeps the server's extra error fields on error.details", () => {
    const response = { status: 409, headers: { get: () => null } };
    const error = createApiError(response, { error: { code: "OWNER_HAS_NO_SUCCESSOR", message: "m", agencyName: "Bayani Tours" } }, "fallback");
    expect(error.code).toBe("OWNER_HAS_NO_SUCCESSOR");
    expect(error.details).toMatchObject({ agencyName: "Bayani Tours" });
  });
});
