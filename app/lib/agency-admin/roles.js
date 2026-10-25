// app/lib/agency-admin/roles.js
/** Owners and admins with an active membership run the agency: they get the Agency tab. */
export function canManageAgency(membership) {
  return membership?.status === "ACTIVE" && (membership.role === "OWNER" || membership.role === "ADMIN");
}
