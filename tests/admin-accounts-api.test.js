import { describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/api/client.js", () => ({
  fetchApi: vi.fn().mockResolvedValue({}),
}));

import { fetchApi } from "../app/lib/api/client.js";
import { fetchAllAccounts, fetchAccountDetail } from "../app/lib/api/index.js";

describe("admin accounts API helpers", () => {
  it("lists every account from /admin/users", async () => {
    await fetchAllAccounts();
    expect(fetchApi).toHaveBeenLastCalledWith("/admin/users");
  });

  it("loads one account from /admin/users/:userId", async () => {
    await fetchAccountDetail("11111111-1111-4111-8111-111111111111");
    expect(fetchApi).toHaveBeenLastCalledWith("/admin/users/11111111-1111-4111-8111-111111111111");
  });
});
