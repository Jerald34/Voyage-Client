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

  // Older servers have a strict login schema that rejects unknown keys, and the
  // server treats a missing rememberMe as remembered, so true is never sent.
  it("omits rememberMe from the body by default", async () => {
    fetchApi.mockResolvedValueOnce({ user: { id: "user-1" } });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login({ email: "a@example.com", password: "password123" }));

    expect(JSON.parse(fetchApi.mock.calls[0][1].body)).toEqual({ email: "a@example.com", password: "password123" });
    expect(JSON.parse(fetchApi.mock.calls[0][1].body)).not.toHaveProperty("rememberMe");
  });

  it("omits rememberMe from the body when it is explicitly true", async () => {
    fetchApi.mockResolvedValueOnce({ user: { id: "user-1" } });
    const { result } = renderHook(() => useAuth());

    await act(() => result.current.login({ email: "a@example.com", password: "password123", rememberMe: true }));

    expect(JSON.parse(fetchApi.mock.calls[0][1].body)).not.toHaveProperty("rememberMe");
  });
});

describe("oauthStartUrl", () => {
  it("adds remember=0 only when the user opted out", () => {
    expect(oauthStartUrl("google", { rememberMe: false })).toMatch(/\/auth\/google\/start\?remember=0$/);
    expect(oauthStartUrl("google", { rememberMe: true })).toMatch(/\/auth\/google\/start$/);
    expect(oauthStartUrl("google")).toMatch(/\/auth\/google\/start$/);
  });
});
