import { NextResponse } from "next/server";
import { withTrustedClientIp } from "./app/lib/server/trustedClientIp";

// Runs before the `/api/:path*` rewrite in next.config.mjs. Request headers set
// here are forwarded to the rewrite destination, so the backend receives the
// real client IP for rate limiting (see app/lib/server/trustedClientIp.js).
export function proxy(request) {
  return NextResponse.next({
    request: { headers: withTrustedClientIp(request.headers) },
  });
}

export const config = {
  matcher: "/api/:path*",
};
