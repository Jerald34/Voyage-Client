"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgencyRole } from "@/app/hooks/useAgencyRole";
import AgencySettingsPage from "@/app/components/settings/AgencySettingsPage";

export default function Page({ params }) {
  const { agencyId } = use(params);
  const role = useAgencyRole(agencyId);
  const router = useRouter();

  useEffect(() => {
    if (role === "STAFF") {
      // Persist a one-time toast key; the team page reads & clears it.
      try { sessionStorage.setItem("voyage:settingsDeniedToast", "1"); } catch {}
      router.replace(`/agency/${agencyId}/team`);
    }
  }, [role, router, agencyId]);

  if (role === "STAFF" || role == null) return null;
  return <AgencySettingsPage agencyId={agencyId} />;
}
