// Streaming proxy for the agent run SSE endpoint.
//
// IMPORTANT: this lives at a STATIC path (/api/stream) on purpose. Next.js
// resolves routes in phases: filesystem/static routes → `afterFiles` rewrites →
// dynamic routes. Our blanket `/api/:path*` proxy rewrite is an `afterFiles`
// rewrite, so it runs BEFORE dynamic routes — a dynamic Route Handler like
// /api/agencies/[agencyId]/.../stream would be swallowed by the buffering proxy
// and never run. A static route is matched before the rewrite, so it wins.
//
// The agent run id + agency id are passed as query params instead of path
// segments. We forward to the backend's real stream path and pipe the upstream
// body straight through as a live ReadableStream so SSE events reach the browser
// as they are written (the rewrite buffers the body, which breaks SSE).

import { trustedClientIpHeaders } from "../../lib/server/trustedClientIp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agencyId");
  const runId = searchParams.get("runId");

  if (!agencyId || !runId) {
    return new Response("Missing agencyId or runId", { status: 400 });
  }

  const target = `${API_PROXY_TARGET}/agencies/${encodeURIComponent(
    agencyId
  )}/agent/runs/${encodeURIComponent(runId)}/stream`;

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: {
        // Forward the session cookie so the backend can authenticate the run.
        cookie: request.headers.get("cookie") ?? "",
        accept: "text/event-stream",
        // Signed client IP, so the backend rate-limits the user, not this server.
        ...trustedClientIpHeaders(request.headers),
      },
      cache: "no-store",
      // Abort the upstream fetch when the browser disconnects, so the backend's
      // SSE controller runs its cleanup (unsubscribe + tool registry clear).
      signal: request.signal,
    });
  } catch (err) {
    return new Response(`Upstream stream unavailable: ${err?.message ?? "error"}`, {
      status: 502,
    });
  }

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "");
    return new Response(body, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
