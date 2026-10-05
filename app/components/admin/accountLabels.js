/**
 * Plain-language labels for the admin Accounts section.
 * Unknown values fall through to the raw string at the call site, so a new
 * server-side enum never renders as a blank.
 */

export const ACCOUNT_TYPE_LABELS = {
  PERSONAL: "Personal",
  AGENCY_USER: "Agency",
  PENDING: "Setup incomplete",
};

export const MEMBERSHIP_ROLE_LABELS = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export const SIGN_IN_LABELS = {
  PASSWORD: "Email & password",
  GOOGLE: "Google",
  APPLE: "Apple",
};

/** Same output as the agency table's date column. */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
