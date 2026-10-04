/**
 * Where an authenticated landing on `/` should open, from its query string.
 *
 * - `tab=team&invited=1` (invite just accepted): the Dashboard, with the
 *   "You joined this agency" notice.
 * - `tab=team` (e.g. /agency/:id/team): Settings, scrolled to the Team panel.
 * - anything else: the Command Center.
 *
 * @param {URLSearchParams} searchParams
 * @returns {{ initialTab: string, showJoinedNotice: boolean, settingsSection: string | null }}
 */
export function resolveInitialView(searchParams) {
  const wantsTeam = searchParams.get("tab") === "team";
  const invited = searchParams.get("invited") === "1";

  if (wantsTeam && invited) {
    return { initialTab: "dashboard", showJoinedNotice: true, settingsSection: null };
  }
  if (wantsTeam) {
    return { initialTab: "settings", showJoinedNotice: false, settingsSection: "team" };
  }
  return { initialTab: "command-center", showJoinedNotice: false, settingsSection: null };
}
