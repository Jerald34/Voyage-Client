"use client";
import { useAgencyRole } from "@/app/hooks/useAgencyRole";
import OwnerOverview from "./OwnerOverview";
import StaffMyWork from "./StaffMyWork";

export default function AgencyDashboardClient({ agencyId, initialData }) {
  // Prefer the server-provided view; fall back to client-side role lookup
  // (e.g. when SSR failed and initialData is null).
  const view = initialData?.view;
  const role = useAgencyRole(agencyId);

  const effectiveView =
    view ?? (role === "STAFF" ? "staff" : role ? "owner" : null);

  if (effectiveView === null) {
    // role still unknown (loading from localStorage) — render nothing
    return null;
  }

  if (effectiveView === "staff") {
    return <StaffMyWork agencyId={agencyId} initialData={initialData} />;
  }
  return <OwnerOverview agencyId={agencyId} initialData={initialData} />;
}
