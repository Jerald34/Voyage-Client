import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../app/lib/api/index.js", () => ({
  fetchApi,
  setAccountType: vi.fn(),
  requestEmailVerification: vi.fn(),
  confirmEmailVerification: vi.fn(),
  acceptInvitation: vi.fn(),
}));

import { oauthStartUrl, useAuth } from "../app/hooks/useAuth";

beforeEach(() => {
  fetchApi.mockReset();
  window.localStorage.clear();
});

describe("useAuth — keep me signed in", () => {
  it("sends rememberMe with the login request", async () => {
    fetchApi.mockResolvedValueOnce({ user: { id: "user-1" } });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login({ email: "a@example.com", password: "password123", rememberMe: false }));

    expect(fetchApi).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@example.com", password: "password123", rememberMe: false }),
    });
  });

  it("defaults rememberMe to true", async () => {
    fetchApi.mockResolvedValueOnce({ user: { id: "user-1" } });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login({ email: "a@example.com", password: "password123" }));

    expect(JSON.parse(fetchApi.mock.calls[0][1].body).rememberMe).toBe(true);
  });
});

describe("oauthStartUrl", () => {
  it("adds remember=0 only when the user opted out", () => {
    expect(oauthStartUrl("google", { rememberMe: false })).toMatch(/\/auth\/google\/start\?remember=0$/);
    expect(oauthStartUrl("google", { rememberMe: true })).toMatch(/\/auth\/google\/start$/);
    expect(oauthStartUrl("google")).toMatch(/\/auth\/google\/start$/);
  });
});
