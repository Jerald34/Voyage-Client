import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { voyageTourHelpBullets, voyageTourSteps } from "../tutorial/tutorialContent.js";
import DangerZoneCard from "../../settings/DangerZoneCard.jsx";
import ReportProblemModal from "../../settings/ReportProblemModal.jsx";
import { createProblemReport } from "../../../lib/api/support.js";

function formatReadOnlyValue(value) {
  const text = String(value ?? "").trim();
  return text || "Not set";
}

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

function getStatusClass(status) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "VERIFIED") {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
  if (normalized === "PENDING" || normalized === "INVITED") {
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }
  return "bg-slate-500/15 text-slate-300 border-white/10";
}

function getFieldClass(readOnly = false) {
  return [
    "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    "bg-background text-text-primary placeholder:text-text-soft/70",
    "focus:border-secondary focus:ring-2 focus:ring-secondary/20",
    readOnly ? "border-border/70 bg-surface-elevated/70" : "border-border",
    readOnly ? "cursor-not-allowed opacity-90" : "",
  ].join(" ");
}

function sanitizeBusinessPhoneInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function Panel({ eyebrow, title, description, children, className = "" }) {
  return (
    <section className={`rounded-[24px] border border-border bg-surface/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-soft">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-text-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, readOnly = false, id }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">{label}</span>
      <input id={id} className={getFieldClass(readOnly)} value={value} readOnly={readOnly} />
    </label>
  );
}

function TextInputField({ label, id, value, onChange, placeholder, readOnly = false, autoComplete, type = "text", inputMode, pattern, maxLength }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">{label}</span>
      <input
        id={id}
        className={getFieldClass(readOnly)}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
      />
    </label>
  );
}

export default function SettingsPage({
  user,
  agency,
  membership,
  logout,
  onUpdateProfile,
  onUpdateAgency,
  onReplayTutorial,
}) {
  const { theme, setTheme } = useTheme();
  const isPersonal = user?.accountType === "PERSONAL";

  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [agencyName, setAgencyName] = useState("");
  const [savedAgencyName, setSavedAgencyName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [savedBusinessPhone, setSavedBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [savedBusinessEmail, setSavedBusinessEmail] = useState("");
  const [city, setCity] = useState("");
  const [savedCity, setSavedCity] = useState("");
  const [country, setCountry] = useState("");
  const [savedCountry, setSavedCountry] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    const nextDisplayName = String(user?.displayName ?? "");
    setDisplayName(nextDisplayName);
    setSavedDisplayName(nextDisplayName);
    setProfileError("");
    setIsSavingProfile(false);
  }, [user?.displayName]);

  useEffect(() => {
    const nextAgencyName = String(agency?.name ?? "");
    const nextBusinessPhone = sanitizeBusinessPhoneInput(agency?.businessPhone ?? "");
    const nextBusinessEmail = String(agency?.businessEmail ?? "");
    const nextCity = String(agency?.city ?? "");
    const nextCountry = String(agency?.country ?? "");

    setAgencyName(nextAgencyName);
    setSavedAgencyName(nextAgencyName);
    setBusinessPhone(nextBusinessPhone);
    setSavedBusinessPhone(nextBusinessPhone);
    setBusinessEmail(nextBusinessEmail);
    setSavedBusinessEmail(nextBusinessEmail);
    setCity(nextCity);
    setSavedCity(nextCity);
    setCountry(nextCountry);
    setSavedCountry(nextCountry);
    setWorkspaceError("");
    setIsSavingWorkspace(false);
  }, [agency?.businessEmail, agency?.businessPhone, agency?.city, agency?.country, agency?.name]);

  const canEditWorkspace = membership?.role === "OWNER" && membership?.status === "ACTIVE";
  const accountChanged = displayName.trim() !== savedDisplayName.trim();
  const workspaceChanged =
    agencyName.trim() !== savedAgencyName.trim() ||
    businessPhone.trim() !== savedBusinessPhone.trim() ||
    businessEmail.trim() !== savedBusinessEmail.trim() ||
    city.trim() !== savedCity.trim() ||
    country.trim() !== savedCountry.trim();

  const accountStatus = formatReadOnlyValue(user?.status);
  const agencyStatus = formatReadOnlyValue(agency?.status);
  const themeLabel = theme === "dark" ? "Dark" : "Light";
  const verificationLabel = formatVerifiedValue(user?.emailVerifiedAt);
  const isProfileSavingDisabled = !accountChanged || isSavingProfile || !onUpdateProfile;
  const isWorkspaceSavingDisabled = !canEditWorkspace || !workspaceChanged || isSavingWorkspace || !onUpdateAgency;

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

  const handleWorkspaceSubmit = async (event) => {
    event.preventDefault();
    if (!canEditWorkspace) return;

    const normalizedAgencyValues = {
      name: agencyName.trim(),
      businessPhone: sanitizeBusinessPhoneInput(businessPhone),
      businessEmail: businessEmail.trim(),
      city: city.trim(),
      country: country.trim(),
    };

    if (!normalizedAgencyValues.name) {
      setWorkspaceError("Agency name is required.");
      return;
    }
    if (!normalizedAgencyValues.businessPhone) {
      setWorkspaceError("Business phone is required.");
      return;
    }
    if (!normalizedAgencyValues.city) {
      setWorkspaceError("City is required.");
      return;
    }
    if (!normalizedAgencyValues.country) {
      setWorkspaceError("Country is required.");
      return;
    }
    if (!workspaceChanged) return;

    setWorkspaceError("");
    setIsSavingWorkspace(true);
    try {
      await onUpdateAgency?.(normalizedAgencyValues);
      setAgencyName(normalizedAgencyValues.name);
      setBusinessPhone(normalizedAgencyValues.businessPhone);
      setBusinessEmail(normalizedAgencyValues.businessEmail);
      setCity(normalizedAgencyValues.city);
      setCountry(normalizedAgencyValues.country);
      setSavedAgencyName(normalizedAgencyValues.name);
      setSavedBusinessPhone(normalizedAgencyValues.businessPhone);
      setSavedBusinessEmail(normalizedAgencyValues.businessEmail);
      setSavedCity(normalizedAgencyValues.city);
      setSavedCountry(normalizedAgencyValues.country);
    } catch (error) {
      setWorkspaceError(error?.message || "Unable to update workspace details.");
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const workspaceFields = useMemo(() => ([
    {
      label: "Agency name",
      value: agencyName,
      onChange: (event) => setAgencyName(event.target.value),
      placeholder: "Enter agency name",
    },
    {
      label: "Business phone",
      value: businessPhone,
      onChange: (event) => setBusinessPhone(sanitizeBusinessPhoneInput(event.target.value)),
      placeholder: "Digits only",
      inputMode: "numeric",
      pattern: "[0-9]*",
      maxLength: 30,
      autoComplete: "tel-national",
    },
    {
      label: "Business email",
      value: businessEmail,
      onChange: (event) => setBusinessEmail(event.target.value),
      placeholder: "Enter business email",
      autoComplete: "email",
    },
    {
      label: "City",
      value: city,
      onChange: (event) => setCity(event.target.value),
      placeholder: "Enter city",
    },
    {
      label: "Country",
      value: country,
      onChange: (event) => setCountry(event.target.value),
      placeholder: "Enter country",
    },
    { label: "Membership role", value: formatReadOnlyValue(membership?.role) },
  ]), [agencyName, businessEmail, businessPhone, city, country, membership?.role]);

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

            {profileError ? <p className="text-sm font-medium text-red-400" role="alert">{profileError}</p> : null}

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

        {!isPersonal && <Panel
          eyebrow="Workspace"
          title="Agency details"
          description="Manage the shared agency profile that powers the dashboard and itinerary flows."
        >
          {!canEditWorkspace ? (
            <p className="mb-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-soft">
              Only the agency owner can edit workspace details.
            </p>
          ) : null}

          <form className="grid gap-4" onSubmit={handleWorkspaceSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {workspaceFields.map((field) => (
                <TextInputField
                  key={field.label}
                  label={field.label}
                  id={field.label.toLowerCase().replace(/\s+/g, "-")}
                  value={field.value || ""}
                  onChange={field.onChange}
                  readOnly={field.label === "Membership role" || !canEditWorkspace}
                  placeholder={field.placeholder || field.label}
                  type={field.type}
                  inputMode={field.inputMode}
                  pattern={field.pattern}
                  maxLength={field.maxLength}
                  autoComplete={field.autoComplete}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-pill border px-3 py-1 text-xs font-semibold ${getStatusClass(agency?.status)}`}>
                {agencyStatus}
              </span>
              <span className="text-sm text-text-soft">Agency status</span>
            </div>

            {workspaceError ? <p className="text-sm font-medium text-red-400" role="alert">{workspaceError}</p> : null}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="rounded-pill bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isWorkspaceSavingDisabled}
              >
                {isSavingWorkspace ? "Saving..." : "Save workspace changes"}
              </button>
            </div>
          </form>
        </Panel>}

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
          description="Replay the homepage walkthrough anytime or use the quick reference below to remember where each action lives."
          className="xl:col-span-2"
        >
          <div className="grid gap-4 rounded-[22px] border border-border bg-surface/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4 xl:border-r xl:border-border/70 xl:pr-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-soft">Tutorial replay</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-text-primary">Walk through the live dashboard</h3>
                <p className="mt-1 text-sm leading-6 text-text-soft">
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
                    className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm leading-5 text-text-soft"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-soft">Quick steps</p>
                <p className="hidden text-xs text-text-soft lg:block">{voyageTourSteps.length} guided stops</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                {voyageTourSteps.map((step, index) => (
                  <article
                    key={step.title}
                    className="min-h-[148px] rounded-2xl border border-border bg-background px-3.5 py-3"
                    aria-label={`Step ${index + 1}: ${step.title}`}
                  >
                    <p className="inline-flex h-6 items-center rounded-pill bg-secondary/10 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                      Step {index + 1}
                    </p>
                    <h4 className="mt-2 text-sm font-semibold leading-5 text-text-primary">{step.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-text-soft">{step.description}</p>
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
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" role="status">
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

        {!isPersonal && membership?.role === "OWNER" && agency?.id ? (
          <DangerZoneCard
            agencyId={agency.id}
            agencyName={agency.name ?? savedAgencyName ?? ""}
          />
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
