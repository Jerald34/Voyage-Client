/**
 * Where an authenticated landing on `/` should open, from its query string.
 *
 * - `tab=team&invited=1` (invite just accepted): the Dashboard, with the
 *   "You joined this agency" notice.
 * - `tab=team` (e.g. /agency/:id/team): Settings, scrolled to the Team panel.
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
    return { initialTab: "settings", showJoinedNotice: false, settingsSection: "team" };
  }
  if (tab === "admin") {
    return { initialTab: "admin", showJoinedNotice: false, settingsSection: null };
  }
  return { initialTab: "command-center", showJoinedNotice: false, settingsSection: null };
}

/**
 * The tab the main area actually shows. Users without an agency workspace have
 * no dashboard, and only super admins have the Admin tab: anyone else who opens
 * an admin link lands on the Planner instead of an empty page.
 */
export function resolveVisibleTab({ activeTab, user, isPersonal, agencyId }) {
  if (!user) return activeTab;
  if (activeTab === "dashboard" && (isPersonal || !agencyId)) return "command-center";
  if (activeTab === "admin" && user.role !== "SUPER_ADMIN") return "command-center";
  return activeTab;
}
