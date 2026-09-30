// Server-only helpers for the `/api` → backend proxy.
//
// Every browser request reaches the backend through this Next app, so the backend
// sees this app's server IP for all users and would rate-limit everyone as one
// client. We forward the real client IP in a header, signed with a shared secret
// (API_PROXY_SECRET, set to the same value on the backend) so a browser cannot pick
// its own rate-limit bucket by sending the header itself.
//
// The client IP comes from `x-real-ip` / `x-forwarded-for`, which Vercel sets and
// overwrites at its edge. If this app is ever self-hosted, it must sit behind a
// proxy that does the same, or these values can be spoofed.

export const PROXY_CLIENT_IP_HEADER = "x-voyage-client-ip";
export const PROXY_SECRET_HEADER = "x-voyage-proxy-secret";

export function readClientIp(headers) {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "";
}

/** Just the signed client-IP headers for `incoming`, or `{}` when unconfigured. */
export function trustedClientIpHeaders(incoming, secret = process.env.API_PROXY_SECRET) {
  const clientIp = readClientIp(incoming);
  if (!secret || !clientIp) return {};

  return {
    [PROXY_CLIENT_IP_HEADER]: clientIp,
    [PROXY_SECRET_HEADER]: secret,
  };
}

/** Copy of `incoming` with the signed client-IP headers set (and any client-sent ones removed). */
export function withTrustedClientIp(incoming, secret = process.env.API_PROXY_SECRET) {
  const headers = new Headers(incoming);
  headers.delete(PROXY_CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);

  for (const [name, value] of Object.entries(trustedClientIpHeaders(incoming, secret))) {
    headers.set(name, value);
  }

  return headers;
}
