"use client";
import { useEffect, useMemo, useState } from "react";
import { updateAgencySettings, fetchTeam } from "@/app/lib/api/index.js";
import { sanitizeBusinessPhoneInput, validateBusinessPhone } from "@/app/components/auth/authValidation.js";
import { useAgencyRole } from "@/app/hooks/useAgencyRole";
import DangerZoneCard from "./DangerZoneCard";

function getFieldClass() {
  return [
    "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    "bg-surface text-text-primary placeholder:text-text-soft",
    "border-border/10 focus:border-secondary/50 focus:ring-1 focus:ring-secondary/10 focus:outline-none",
  ].join(" ");
}

export default function AgencySettingsPage({ agencyId }) {
  const role = useAgencyRole(agencyId);

  // Read agency from localStorage so the form is pre-populated without a round-trip
  const initialAgency = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("voyage-user");
      const user = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(user?.memberships)) return null;
      const m = user.memberships.find((m) => m.agencyId === agencyId);
      return m?.agency ?? null;
    } catch {
      return null;
    }
  }, [agencyId]);

  const [agencyName, setAgencyName] = useState(initialAgency?.name ?? "");
  const [businessPhone, setBusinessPhone] = useState(sanitizeBusinessPhoneInput(initialAgency?.businessPhone));
  const [businessEmail, setBusinessEmail] = useState(initialAgency?.businessEmail ?? "");
  const [city, setCity] = useState(initialAgency?.city ?? "");
  const [country, setCountry] = useState(initialAgency?.country ?? "");

  const [savedValues, setSavedValues] = useState({
    agencyName: initialAgency?.name ?? "",
    businessPhone: sanitizeBusinessPhoneInput(initialAgency?.businessPhone),
    businessEmail: initialAgency?.businessEmail ?? "",
    city: initialAgency?.city ?? "",
    country: initialAgency?.country ?? "",
  });

  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Team data for Danger Zone
  const [teamData, setTeamData] = useState({ members: [], viewerRole: null });

  useEffect(() => {
    fetchTeam(agencyId)
      .then((data) => setTeamData(data))
      .catch(() => {});
  }, [agencyId]);

  const hasChanges =
    agencyName.trim() !== savedValues.agencyName ||
    businessPhone.trim() !== savedValues.businessPhone ||
    businessEmail.trim() !== savedValues.businessEmail ||
    city.trim() !== savedValues.city ||
    country.trim() !== savedValues.country;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = agencyName.trim();
    const phone = sanitizeBusinessPhoneInput(businessPhone);
    const email = businessEmail.trim();
    const cityVal = city.trim();
    const countryVal = country.trim();

    if (!name) { setFormError("Agency name is required."); return; }
    const phoneError = validateBusinessPhone(phone);
    if (phoneError) { setFormError(phoneError); return; }
    if (!cityVal) { setFormError("City is required."); return; }
    if (!countryVal) { setFormError("Country is required."); return; }

    setFormError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateAgencySettings(agencyId, {
        name,
        businessPhone: phone,
        businessEmail: email,
        city: cityVal,
        country: countryVal,
      });
      setSavedValues({ agencyName: name, businessPhone: phone, businessEmail: email, city: cityVal, country: countryVal });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setFormError(err?.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary tracking-tight">Agency settings</h1>
      </header>

      <section className="rounded-[24px] border border-border/10 bg-surface p-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Agency name</span>
              <input
                className={getFieldClass()}
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Your agency name"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Business phone</span>
              <input
                className={getFieldClass()}
                value={businessPhone}
                onChange={(e) => setBusinessPhone(sanitizeBusinessPhoneInput(e.target.value))}
                placeholder="Digits only"
                inputMode="numeric"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Business email</span>
              <input
                className={getFieldClass()}
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="contact@agency.com"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">City</span>
              <input
                className={getFieldClass()}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Country</span>
              <input
                className={getFieldClass()}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter country"
              />
            </label>
          </div>

          {formError && (
            <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger" role="alert">
              {formError}
            </p>
          )}
          {saveSuccess && (
            <p className="rounded-lg bg-status-success/10 px-3 py-2 text-sm text-status-success">
              Settings saved.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {role === "OWNER" && (
        <DangerZoneCard
          agencyId={agencyId}
          agencyName={savedValues.agencyName || agencyName}
          members={teamData.members}
        />
      )}
    </div>
  );
}
