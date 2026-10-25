import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { buildTourSteps, voyageTourHelpBullets } from "../tutorial/tutorialContent.js";
import ReportProblemModal from "../../settings/ReportProblemModal.jsx";
import SystemRequirementsTable from "../../settings/SystemRequirementsTable.jsx";
import AgencyDetailsForm from "../../settings/AgencyDetailsForm.jsx";
import { Field, Panel, TextInputField, formatReadOnlyValue, getStatusClass } from "../../settings/settingsFields.jsx";
import TeamPage from "../../team/TeamPage.jsx";
import { createProblemReport } from "../../../lib/api/support.js";
import { canManageAgency } from "../../../lib/agency-admin/roles.js";

function formatVerifiedValue(emailVerifiedAt) {
  if (!emailVerifiedAt) return "Not verified";
  const verifiedAt = new Date(emailVerifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) return "Verified";
  return `Verified on ${verifiedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function SettingsPage({
  user,
  agency,
  membership,
  logout,
  onUpdateProfile,
  onUpdateAgency,
  onOpenAgency,
  onReplayTutorial,
  focusSection = null,
  onFocusSectionHandled,
}) {
  const { theme, setTheme } = useTheme();
  const isPersonal = user?.accountType === "PERSONAL";
  // The quick reference lists this person's own tour, minus the welcome card.
  const tourSteps = useMemo(
    () => buildTourSteps({ user, agencyId: agency?.id ?? null }).filter((step) => step.target),
    [user, agency?.id],
  );

  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const teamRef = useRef(null);

  // A `tab=team` link opens Settings scrolled to the Team panel, once. Focus
  // moves there too (without a second scroll) so keyboard and screen reader
  // users land on it, and the scroll skips the animation for reduced motion.
  useEffect(() => {
    const panel = teamRef.current;
    if (focusSection !== "team" || !panel) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    panel.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    panel.focus({ preventScroll: true });
    onFocusSectionHandled?.();
  }, [focusSection, onFocusSectionHandled]);

  useEffect(() => {
    const nextDisplayName = String(user?.displayName ?? "");
    setDisplayName(nextDisplayName);
    setSavedDisplayName(nextDisplayName);
    setProfileError("");
    setIsSavingProfile(false);
  }, [user?.displayName]);

  // Owners and admins run the agency from the Agency tab; Settings keeps their own things.
  const managesAgency = !isPersonal && canManageAgency(membership);
  const accountChanged = displayName.trim() !== savedDisplayName.trim();

  const accountStatus = formatReadOnlyValue(user?.status);
  const themeLabel = theme === "dark" ? "Dark" : "Light";
  const verificationLabel = formatVerifiedValue(user?.emailVerifiedAt);
  const isProfileSavingDisabled = !accountChanged || isSavingProfile || !onUpdateProfile;

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setProfileError("Display name is required.");
      return;
    }
    if (!accountChanged) return;

    setProfileError("");
    setIsSavingProfile(true);
    try {
      await onUpdateProfile?.({ displayName: nextDisplayName });
      setSavedDisplayName(nextDisplayName);
      setDisplayName(nextDisplayName);
    } catch (error) {
      setProfileError(error?.message || "Unable to update your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div
      data-testid="settings-page"
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain rounded-[28px] border border-border/10 bg-background p-4 pb-8 text-text-primary max-[900px]:rounded-none max-[900px]:border-0 max-[900px]:pb-[calc(2rem+env(safe-area-inset-bottom))]"
    >
      <header className="flex flex-col gap-2 rounded-[24px] border border-border bg-gradient-to-r from-surface to-surface-elevated p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-soft">Workspace settings</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="max-w-3xl text-sm leading-6 text-text-soft">
          Update your account identity, workspace profile, appearance, and session details using the live agency data already in this workspace.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          eyebrow="Account"
          title="Personal details"
          description="Update the signed-in display name and review the authenticated account record."
        >
          <form className="grid gap-4" onSubmit={handleProfileSubmit}>
            <TextInputField
              label="Display name"
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Enter your display name"
              autoComplete="name"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email" value={formatReadOnlyValue(user?.email)} readOnly />
              <Field label="Role" value={formatReadOnlyValue(user?.role)} readOnly />
              <Field label="Email verification" value={verificationLabel} readOnly />
              <Field label="Account ID" value={formatReadOnlyValue(user?.id)} readOnly />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-pill border px-3 py-1 text-xs font-semibold ${getStatusClass(user?.status)}`}>
                {accountStatus}
              </span>
              <span className="text-sm text-text-soft">Account status</span>
            </div>

            {profileError ? <p className="text-sm font-medium text-status-danger" role="alert">{profileError}</p> : null}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="rounded-pill bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProfileSavingDisabled}
              >
                {isSavingProfile ? "Saving..." : "Save account changes"}
              </button>
            </div>
          </form>
        </Panel>

        {!isPersonal && (managesAgency ? (
          <Panel
            eyebrow="Workspace"
            title="Agency"
            description="Team, agency details, plan and usage, and ownership are in the Agency tab."
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="m-0 text-sm text-text-muted">
                {agency?.name || "Your agency"} · {membership?.role === "OWNER" ? "Owner" : "Admin"}
              </p>
              <button
                type="button"
                className="rounded-pill border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-secondary hover:text-secondary"
                onClick={() => onOpenAgency?.()}
              >
                Open Agency
              </button>
            </div>
          </Panel>
        ) : (
          <Panel
            eyebrow="Workspace"
            title="Agency details"
            description="Manage the shared agency profile that powers the dashboard and itinerary flows."
          >
            <AgencyDetailsForm agency={agency} membership={membership} onUpdateAgency={onUpdateAgency} />
          </Panel>
        ))}

        <Panel
          eyebrow="Appearance"
          title="Theme"
          description="Toggle the current workspace theme using the shared dashboard theme provider."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Current theme: {themeLabel}</p>
              <p className="mt-1 text-sm text-text-soft">Theme changes apply immediately across the dashboard.</p>
            </div>
            <button
              type="button"
              className="rounded-pill border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-secondary hover:text-secondary"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Switch to {theme === "dark" ? "light" : "dark"} mode
            </button>
          </div>
        </Panel>

        <Panel
          eyebrow="Session"
          title="Signed in"
          description="Confirm the current account email and end the session when needed."
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">Email</p>
              <p className="mt-2 text-sm font-medium text-text-primary">{formatReadOnlyValue(user?.email)}</p>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="rounded-pill border border-border bg-background px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-secondary hover:text-secondary"
                onClick={() => logout?.()}
              >
                Logout
              </button>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Help"
          title="First-use tutorial"
          description="Replay the walkthrough any time, or use the quick reference below to find where each action lives."
          className="xl:col-span-2"
        >
          <div className="grid gap-4 rounded-[22px] border border-border bg-surface/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4 xl:border-r xl:border-border/70 xl:pr-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Tutorial replay</p>
                <h3 className="mt-2 font-sans text-lg font-semibold tracking-[-0.02em] text-text-primary">Walk through the live dashboard</h3>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  A compact reference for the guided tour that highlights real controls in place.
                </p>
              </div>

              <button
                type="button"
                className="min-h-11 w-fit rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onReplayTutorial?.()}
                disabled={!onReplayTutorial}
              >
                Replay tutorial
              </button>

              <ul className="grid gap-2">
                {voyageTourHelpBullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm leading-5 text-text-muted"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Quick steps</p>
                <p className="hidden text-xs text-text-muted lg:block">{tourSteps.length} guided stops</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {tourSteps.map((step, index) => (
                  <article
                    key={step.id}
                    className="min-h-[148px] rounded-2xl border border-border bg-background px-3.5 py-3"
                    aria-label={`Step ${index + 1}: ${step.title}`}
                  >
                    <p className="inline-flex h-6 items-center rounded-pill bg-secondary/10 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                      Step {index + 1}
                    </p>
                    <h4 className="mt-2 font-sans text-sm font-semibold leading-5 text-text-primary">{step.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{step.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Support"
          title="Need help?"
          description="Report a problem or send feedback to the Voyage team."
        >
          <div className="flex flex-col gap-3">
            {reportSent ? (
              <p className="rounded-2xl border border-status-success/30 bg-status-success/8 px-4 py-3 text-sm text-status-success" role="status">
                Thanks — your report was sent. We'll take a look.
              </p>
            ) : null}
            <button
              type="button"
              className="min-h-11 w-fit rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition active:scale-[0.97] hover:brightness-110 motion-reduce:transition-none"
              onClick={() => { setReportSent(false); setReportOpen(true); }}
            >
              Report a problem
            </button>
          </div>
        </Panel>

        <Panel
          eyebrow="Help"
          title="System requirements"
          description="What you need to use Voyage on a phone or computer."
        >
          <SystemRequirementsTable />
        </Panel>

        {!isPersonal && !managesAgency && agency?.id ? (
          <section
            ref={teamRef}
            id="settings-team"
            tabIndex={-1}
            aria-label="Team"
            className="scroll-mt-4 rounded-[24px] border border-border bg-surface/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] xl:col-span-2"
          >
            <TeamPage agencyId={agency.id} embedded />
          </section>
        ) : null}
      </div>

      <ReportProblemModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={async (payload) => { await createProblemReport(payload); setReportSent(true); }}
      />
    </div>
  );
}
