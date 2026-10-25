import { canManageAgency } from "./agency-admin/roles.js";

/**
 * Where an authenticated landing on `/` should open, from its query string.
 *
 * - `tab=team&invited=1` (invite just accepted): the Dashboard, with the
 *   "You joined this agency" notice.
 * - `tab=team` (e.g. /agency/:id/team): the Agency tab at Team. People who
 *   can't manage the agency fall back to Settings, scrolled to the Team panel
 *   (see resolveVisibleTab), so `settingsSection` carries "team" for both.
 * - `tab=agency` (e.g. /agency/:id/settings): the Agency tab.
 * - `tab=admin` (new-agency alert email): the Admin tab, for super admins.
 * - anything else: the Planner.
 *
 * @param {URLSearchParams} searchParams
 * @returns {{ initialTab: string, showJoinedNotice: boolean, settingsSection: string | null }}
 */
export function resolveInitialView(searchParams) {
  const tab = searchParams.get("tab");
  const invited = searchParams.get("invited") === "1";

  if (tab === "team" && invited) {
    return { initialTab: "dashboard", showJoinedNotice: true, settingsSection: null };
  }
  if (tab === "team") {
    return { initialTab: "agency", showJoinedNotice: false, settingsSection: "team" };
  }
  if (tab === "agency") {
    return { initialTab: "agency", showJoinedNotice: false, settingsSection: null };
  }
  if (tab === "admin") {
    return { initialTab: "admin", showJoinedNotice: false, settingsSection: null };
  }
  return { initialTab: "command-center", showJoinedNotice: false, settingsSection: null };
}

/**
 * The tab the main area actually shows. Users without an agency workspace have
 * no dashboard, only super admins have the Admin tab, and only active owners and
 * admins have the Agency tab: anyone else who opens one of those links lands on
 * the Planner (or Settings, for Agency) instead of an empty page.
 */
export function resolveVisibleTab({ activeTab, user, isPersonal, agencyId, membership = null }) {
  if (!user) return activeTab;
  if (activeTab === "dashboard" && (isPersonal || !agencyId)) return "command-center";
  if (activeTab === "admin" && user.role !== "SUPER_ADMIN") return "command-center";
  if (activeTab === "agency" && (isPersonal || !agencyId || !canManageAgency(membership))) return "settings";
  return activeTab;
}
