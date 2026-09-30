import { describe, expect, it } from "vitest";
import {
  PROXY_CLIENT_IP_HEADER,
  PROXY_SECRET_HEADER,
  readClientIp,
  trustedClientIpHeaders,
  withTrustedClientIp,
} from "../app/lib/server/trustedClientIp";
import { createApiError } from "../app/lib/api/client";

const SECRET = "s".repeat(48);

describe("trusted client IP forwarding", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(readClientIp(new Headers({ "x-real-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.1" }))).toBe(
      "203.0.113.1",
    );
    expect(readClientIp(new Headers({ "x-forwarded-for": " 198.51.100.1 , 10.0.0.1" }))).toBe("198.51.100.1");
    expect(readClientIp(new Headers())).toBe("");
  });

  it("sets the signed client IP and replaces any client-sent values", () => {
    const headers = withTrustedClientIp(
      new Headers({
        "x-real-ip": "203.0.113.1",
        cookie: "voyage_session=abc",
        [PROXY_CLIENT_IP_HEADER]: "1.1.1.1",
        [PROXY_SECRET_HEADER]: "forged",
      }),
      SECRET,
    );

    expect(headers.get(PROXY_CLIENT_IP_HEADER)).toBe("203.0.113.1");
    expect(headers.get(PROXY_SECRET_HEADER)).toBe(SECRET);
    expect(headers.get("cookie")).toBe("voyage_session=abc");
  });

  it("strips client-sent values and adds nothing when no secret is configured", () => {
    const headers = withTrustedClientIp(
      new Headers({ "x-real-ip": "203.0.113.1", [PROXY_CLIENT_IP_HEADER]: "1.1.1.1", [PROXY_SECRET_HEADER]: "forged" }),
      "",
    );

    expect(headers.has(PROXY_CLIENT_IP_HEADER)).toBe(false);
    expect(headers.has(PROXY_SECRET_HEADER)).toBe(false);
    expect(trustedClientIpHeaders(new Headers({ "x-real-ip": "203.0.113.1" }), "")).toEqual({});
  });
});

describe("createApiError", () => {
  it("tells the user how long to wait after a 429", () => {
    const response = new Response(null, { status: 429, headers: { "Retry-After": "90" } });
    const error = createApiError(
      response,
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
      "fallback",
    );

    expect(error.status).toBe(429);
    expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(error.retryAfter).toBe(90);
    expect(error.message).toBe("Too many requests. Please try again in 2 minutes.");
  });

  it("keeps the server message for other errors", () => {
    const error = createApiError(new Response(null, { status: 400 }), { error: { message: "Bad input" } }, "fallback");

    expect(error.message).toBe("Bad input");
    expect(error.retryAfter).toBeUndefined();
  });
});
