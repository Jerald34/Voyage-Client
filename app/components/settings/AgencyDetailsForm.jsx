// app/components/settings/AgencyDetailsForm.jsx
import { useEffect, useMemo, useState } from "react";
import { TextInputField, formatReadOnlyValue, getStatusClass } from "./settingsFields.jsx";

function sanitizeBusinessPhoneInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/**
 * The shared agency profile: name, business contact and location. Only an active
 * owner can edit it; everyone else sees it read-only. Settings shows it to staff,
 * and the Agency tab's Profile section shows it to owners and admins.
 */
export default function AgencyDetailsForm({ agency, membership, onUpdateAgency }) {
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
  const workspaceChanged =
    agencyName.trim() !== savedAgencyName.trim() ||
    businessPhone.trim() !== savedBusinessPhone.trim() ||
    businessEmail.trim() !== savedBusinessEmail.trim() ||
    city.trim() !== savedCity.trim() ||
    country.trim() !== savedCountry.trim();
  const agencyStatus = formatReadOnlyValue(agency?.status);
  const isWorkspaceSavingDisabled = !canEditWorkspace || !workspaceChanged || isSavingWorkspace || !onUpdateAgency;

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
    <>
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

        {workspaceError ? <p className="text-sm font-medium text-status-danger" role="alert">{workspaceError}</p> : null}

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
    </>
  );
}
