import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AgencyDashboardClient from "./components/dashboard/AgencyDashboardClient";

// Server component: this fetch runs on the Next server, so it must hit the real
// backend origin directly (a relative `/api` proxy path can't resolve in Node).
// Browser code uses the same-origin `/api` proxy instead — see next.config.mjs.
const API_URL = process.env.API_PROXY_TARGET || "http://localhost:4000";

export default async function AgencyIndexPage({ params, searchParams }) {
  const { agencyId } = await params;
  const search = (await searchParams) ?? {};

  if (search.invited === "1") {
    redirect(`/agency/${agencyId}/team?invited=1`);
  }

  // Forward session cookie to the API for SSR fetch.
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("voyage_session");
  const cookieHeader = sessionCookie ? `voyage_session=${sessionCookie.value}` : "";

  let initialData = null;
  try {
    const response = await fetch(`${API_URL}/agencies/${agencyId}/dashboard?period=30d`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store"
    });
    if (response.ok) {
      initialData = await response.json();
    }
    // 401/403 → fall through with null; client component will surface auth state.
  } catch {
    // Network error → null; the client poll will retry.
  }

  return <AgencyDashboardClient agencyId={agencyId} initialData={initialData} />;
}
