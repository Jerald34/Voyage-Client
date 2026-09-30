// Three-step register wizard: account details, account type picker, then agency details.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { requestEmailVerification } from "../../lib/api/index.js";
import {
  agencyLocationOptions,
  agencyCountryOptions,
  registerValidationErrorCodes,
} from "./authConstants.js";
import {
  sanitizeBusinessPhoneInput,
  validateBusinessPhone,
  sanitizeEmailInput,
  getPasswordSimilarityError,
  mapAuthErrorToRegisterErrors,
} from "./authValidation.js";
import OAuthButtons from "./OAuthButtons.jsx";
import FormField, { fieldSurfaceClass as authFieldSurfaceClass, fieldBaseClass as authFieldBaseClass } from "../ui/FormField.jsx";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  HomeIcon,
  PhoneIcon,
  GlobeIcon,
  MapPinIcon,
  ShieldIcon,
} from "../icons/index.js";

export default function RegisterWizard({
  wizardStep,
  setWizardStep,
  setIsTransitioning,
  isAuthenticated,
  onOpenLegalDoc,
  onComplete,
}) {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const invitedEmail = searchParams.get("email") ?? "";
  const inviteToken = searchParams.get("invite") ?? "";
  const emailLocked = Boolean(invitedEmail);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [step1Errors, setStep1Errors] = useState({});
  const [serverStep1Errors, setServerStep1Errors] = useState({});
  const [verifyState, setVerifyState] = useState({ pendingEmail: "", resendStatus: null });

  // Step "type" error
  const [typeStepError, setTypeStepError] = useState(null);

  // Step 2 fields
  const [agencyName, setAgencyName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [step2Errors, setStep2Errors] = useState({});

  useEffect(() => {
    const mappedErrors = mapAuthErrorToRegisterErrors(auth.error);
    setServerStep1Errors(mappedErrors);

    if (Object.keys(mappedErrors).length > 0 && wizardStep !== 1) {
      setWizardStep(1);
      setIsTransitioning(false);
    }
  }, [auth.error, wizardStep, setWizardStep, setIsTransitioning]);

  const validateStep1 = () => {
    const errors = {};
    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Enter a valid email";
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    else {
      const passwordSimilarityError = getPasswordSimilarityError(email, fullName, password);
      if (passwordSimilarityError) errors.password = passwordSimilarityError;
    }
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!agreedToTerms) errors.terms = "You must agree to the terms";
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Next = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setIsTransitioning(true);
    const result = await auth.register({ email, password, displayName: fullName });
    if (result?.user) {
      setVerifyState({ pendingEmail: result.user.email, resendStatus: null });
      setTimeout(() => {
        setWizardStep("verify");
        setIsTransitioning(false);
      }, 280);
    } else {
      setIsTransitioning(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verifyState.pendingEmail) return;
    setVerifyState((s) => ({ ...s, resendStatus: "sending" }));
    const ok = await auth.resendVerificationEmail(verifyState.pendingEmail);
    setVerifyState((s) => ({ ...s, resendStatus: ok ? "sent" : "error" }));
  };

  const handlePickPersonal = async () => {
    setTypeStepError(null);
    const user = await auth.setAccountType("PERSONAL");
    if (user) {
      onComplete?.();
    } else if (auth.error) {
      setTypeStepError(auth.error.message || "Something went wrong. Please try again.");
    }
  };

  const handlePickAgency = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setWizardStep(2);
      setIsTransitioning(false);
    }, 280);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    auth.setError(null);

    const nextStep2Errors = {};
    const trimmedAgencyName = agencyName.trim();
    const normalizedBusinessPhone = sanitizeBusinessPhoneInput(businessPhone);
    const trimmedBusinessEmail = businessEmail.trim();
    const trimmedCountry = country.trim();
    const trimmedCity = city.trim();

    if (!trimmedAgencyName) nextStep2Errors.agencyName = "Agency name is required";
    const phoneError = validateBusinessPhone(normalizedBusinessPhone);
    if (phoneError) nextStep2Errors.businessPhone = phoneError;
    if (!trimmedBusinessEmail) nextStep2Errors.businessEmail = "Business email is required";
    else if (!/\S+@\S+\.\S+/.test(trimmedBusinessEmail)) nextStep2Errors.businessEmail = "Enter a valid business email";
    if (!trimmedCountry) nextStep2Errors.country = "Country is required";
    if (!trimmedCity) nextStep2Errors.city = "City is required";
    else if (trimmedCountry && !(agencyLocationOptions[trimmedCountry] ?? []).includes(trimmedCity)) {
      nextStep2Errors.city = "Choose a city from the selected country";
    }

    setStep2Errors(nextStep2Errors);
    if (Object.keys(nextStep2Errors).length > 0) {
      return;
    }

    const agencyData = {
      name: trimmedAgencyName,
      businessPhone: normalizedBusinessPhone,
      businessEmail: trimmedBusinessEmail,
      country: trimmedCountry,
      city: trimmedCity,
    };

    // At this point the user is already registered (Step 1 called auth.register,
    // or they are an OAuth user). Just create the agency.
    await auth.createAgency(agencyData);
  };

  const handleStep2Back = () => {
    setIsTransitioning(true);
    auth.setError(null);
    setTimeout(() => {
      setWizardStep("type");
      setIsTransitioning(false);
    }, 280);
  };

  const isRegisterFieldError = registerValidationErrorCodes.has(auth.error?.code);
  const fullNameError = step1Errors.fullName || serverStep1Errors.fullName;
  const emailError = step1Errors.email || serverStep1Errors.email;
  const passwordError = step1Errors.password || serverStep1Errors.password;
  const confirmPasswordError = step1Errors.confirmPassword || serverStep1Errors.confirmPassword;
  const termsError = step1Errors.terms || serverStep1Errors.terms;
  const countryCityOptions = agencyLocationOptions[country] ?? [];

  return (
    <>
      {/* ─── REGISTER STEP 1: Account Details ─── */}
      {wizardStep === 1 && (
        <>
          <div className="mb-7">
            <h2 className="text-[clamp(1.6rem,2.4vw,2.2rem)] mb-2">Create your account</h2>
            <p className="text-[1.08rem] text-text-muted mb-0">Start planning unforgettable trips today.</p>
          </div>

          <OAuthButtons onSelect={(id) => auth.startOAuth(id)} />

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border/[0.12]" />
            <span className="text-text-soft text-[0.78rem] font-bold uppercase tracking-[0.1em] whitespace-nowrap">or continue with email</span>
            <div className="flex-1 h-px bg-border/[0.12]" />
          </div>

          <form onSubmit={handleStep1Next} className="flex flex-col gap-5">
            <FormField
              id="auth-fullname"
              label="Full name"
              icon={<UserIcon width={18} height={18} />}
              error={fullNameError}
            >
              <input id="auth-fullname" type="text" placeholder="Your full name" value={fullName} onChange={(e) => { setFullName(e.target.value); setStep1Errors({}); setServerStep1Errors({}); }} autoComplete="name" className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`} />
            </FormField>

            <FormField
              id="auth-email"
              label={emailLocked ? "Email address (from your invitation)" : "Email address"}
              icon={<MailIcon width={18} height={18} />}
              error={emailError}
            >
              <input
                id="auth-email"
                type="email"
                placeholder="voyager@example.com"
                value={email}
                readOnly={emailLocked}
                onChange={(e) => {
                  if (emailLocked) return;
                  setEmail(sanitizeEmailInput(e.target.value));
                  setStep1Errors({});
                  setServerStep1Errors({});
                }}
                autoComplete="email"
                className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass} ${emailLocked ? "cursor-not-allowed opacity-80" : ""}`}
              />
            </FormField>

            <FormField
              id="auth-password"
              label="Password"
              icon={<LockIcon width={18} height={18} />}
              error={passwordError}
              trailing={
                <button type="button" className="absolute right-3.5 flex items-center justify-center w-8.5 h-8.5 bg-none border-none text-text-soft cursor-pointer rounded-sm transition-all duration-160 hover:text-secondary hover:bg-[rgba(215,122,97,0.06)]" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              }
            >
              <input id="auth-password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setStep1Errors({}); setServerStep1Errors({}); }} autoComplete="new-password" className={`!pl-[46px] !pr-14 py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`} />
            </FormField>

            <FormField
              id="auth-confirm-password"
              label="Confirm password"
              icon={<ShieldIcon width={18} height={18} />}
              error={confirmPasswordError}
            >
              <input id="auth-confirm-password" type="password" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setStep1Errors({}); setServerStep1Errors({}); }} autoComplete="new-password" className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`} />
            </FormField>

            <label className="flex items-center gap-3 cursor-pointer py-0.5" htmlFor="auth-terms">
              <input
                type="checkbox"
                id="auth-terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-border text-secondary focus:ring-secondary cursor-pointer"
              />
              <span className="text-[0.92rem] text-text-muted leading-tight">
                I agree to the{" "}
                <button type="button" className="text-secondary font-semibold hover:underline" onClick={() => onOpenLegalDoc("terms")}>
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" className="text-secondary font-semibold hover:underline" onClick={() => onOpenLegalDoc("privacy")}>
                  Privacy Policy
                </button>
              </span>
            </label>
            {termsError && <span className="text-[0.8rem] text-status-danger mt-0.5">{termsError}</span>}

            <button type="submit" disabled={auth.loading} className="w-full mt-2 inline-flex items-center justify-center gap-3 min-h-[54px] px-7 py-4 border border-transparent rounded-pill text-base font-extrabold cursor-pointer bg-accent text-white shadow-[0_16px_32px_rgba(216,180,160,0.26)] hover:-translate-y-px hover:bg-[#dbbfae] transition-all disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none">
              {auth.loading ? "Creating your account…" : "Next: Choose account type"}
            </button>
          </form>
        </>
      )}

      {/* ─── REGISTER STEP 1.2: Verify your email ─── */}
      {wizardStep === "verify" && (
        <>
          <div className="mb-7">
            <span className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-[rgba(32,178,170,0.12)] border border-[rgba(32,178,170,0.28)]">
              <MailIcon width={22} height={22} />
            </span>
            <h2 className="text-[clamp(1.6rem,2.4vw,2.2rem)] mb-2">Check your inbox</h2>
            <p className="text-[1.08rem] text-text-muted mb-0">
              We sent a confirmation link to <strong className="text-text-primary">{verifyState.pendingEmail}</strong>. Open it to finish setting up your Voyage account.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white/65 dark:bg-surface-elevated/70 p-5 mb-5">
            <p className="text-[0.92rem] text-text-muted leading-6 mb-3">
              Once you verify your email, sign in to continue setting up your account.
            </p>
            <ul className="text-[0.88rem] text-text-soft leading-7 list-disc pl-5">
              <li>Link expires in 24 hours.</li>
              <li>Check your spam folder if you don&apos;t see it.</li>
              {inviteToken && (
                <li>Your agency invitation will apply automatically after sign-in.</li>
              )}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={verifyState.resendStatus === "sending"}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-pill border border-border bg-surface hover:bg-surface-hover transition font-bold text-secondary disabled:opacity-55"
          >
            {verifyState.resendStatus === "sending"
              ? "Sending…"
              : verifyState.resendStatus === "sent"
              ? "Sent — check your inbox"
              : "Resend verification email"}
          </button>

          {verifyState.resendStatus === "error" && auth.error && (
            <p className="mt-3 p-3 rounded-sm bg-status-danger/[0.06] border border-status-danger/[0.18] text-status-danger text-[0.86rem] font-semibold text-center" role="alert">
              {auth.error.message}
            </p>
          )}

          <p className="text-center mt-6 text-text-muted text-[0.92rem]">
            Already verified?{" "}
            <a href="/login?verified=1" className="text-secondary font-extrabold no-underline hover:underline">
              Sign in
            </a>
          </p>
        </>
      )}

      {/* ─── REGISTER STEP 1.5: Account Type Picker ─── */}
      {wizardStep === "type" && (
        <>
          <div className="mb-7">
            <h2 className="text-[clamp(1.6rem,2.4vw,2.2rem)] mb-2">How will you use Voyage?</h2>
            <p className="text-[1.08rem] text-text-muted mb-0">Choose the option that fits you best.</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              disabled={auth.loading}
              onClick={handlePickPersonal}
              className="w-full text-left p-6 rounded-2xl border border-border bg-surface hover:bg-surface-hover transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed group"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[1.08rem] font-extrabold text-text-primary group-hover:text-secondary transition-colors duration-200">
                  Plan my own trips
                </span>
                <span className="text-[0.92rem] text-text-muted leading-relaxed">
                  Use the full AI planning agent for your personal travel. Your itineraries stay private to you.
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={auth.loading}
              onClick={handlePickAgency}
              className="w-full text-left p-6 rounded-2xl border border-border bg-surface hover:bg-surface-hover transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed group"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[1.08rem] font-extrabold text-text-primary group-hover:text-secondary transition-colors duration-200">
                  Set up an agency
                </span>
                <span className="text-[0.92rem] text-text-muted leading-relaxed">
                  Create a shared workspace for your travel agency. Collaborate with your team on client trips.
                </span>
              </div>
            </button>
          </div>

          {typeStepError && (
            <div className="mt-4 p-3 rounded-sm bg-status-danger/[0.06] border border-status-danger/[0.18] text-status-danger text-[0.86rem] font-semibold leading-relaxed text-center" role="alert">
              {typeStepError}
            </div>
          )}
        </>
      )}

      {/* ─── REGISTER STEP 2: Agency Details ─── */}
      {wizardStep === 2 && (
        <>
          <div className="mb-7">
            <h2 className="text-[clamp(1.6rem,2.4vw,2.2rem)] mb-2">Your agency</h2>
            <p className="text-[1.08rem] text-text-muted mb-0">Tell us about your travel agency so we can set up your workspace.</p>
            <p className="mt-2 text-[0.88rem] font-semibold text-text-soft">All agency details are required.</p>
          </div>

          <form onSubmit={handleStep2Submit} noValidate className="flex flex-col gap-5">
            <FormField
              id="auth-agency-name"
              label="Agency name"
              required
              icon={<HomeIcon width={18} height={18} />}
              error={step2Errors.agencyName}
            >
              <input id="auth-agency-name" type="text" placeholder="e.g. Wanderlust Travel Co." value={agencyName} onChange={(e) => { setAgencyName(e.target.value); setStep2Errors((prev) => ({ ...prev, agencyName: undefined })); }} required className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`} />
            </FormField>

            <FormField
              id="auth-business-phone"
              label="Business phone"
              required
              icon={<PhoneIcon width={18} height={18} />}
              error={step2Errors.businessPhone}
            >
              <input
                id="auth-business-phone"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={30}
                placeholder="Digits only"
                value={businessPhone}
                onChange={(e) => {
                  setBusinessPhone(sanitizeBusinessPhoneInput(e.target.value));
                  setStep2Errors((prev) => ({ ...prev, businessPhone: undefined }));
                }}
                required
                className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`}
              />
            </FormField>

            <FormField
              id="auth-business-email"
              label="Business email"
              required
              icon={<MailIcon width={18} height={18} />}
              error={step2Errors.businessEmail}
            >
              <input id="auth-business-email" type="email" placeholder="info@youragency.com" value={businessEmail} onChange={(e) => { setBusinessEmail(sanitizeEmailInput(e.target.value)); setStep2Errors((prev) => ({ ...prev, businessEmail: undefined })); }} required className={`!pl-[46px] pr-[18px] py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`} />
            </FormField>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Country select: kept inline because it uses a <select> with a custom appearance
                  and a trailing ChevronDown — FormField.trailing positions absolutely, which
                  works here, but the select also needs appearance-none + manual pr-12 to
                  avoid overlap. Using FormField with trailing handles this cleanly. */}
              <FormField
                id="auth-country"
                label="Country"
                required
                icon={<GlobeIcon width={18} height={18} />}
                error={step2Errors.country}
                trailing={
                  <ChevronDownIcon className="pointer-events-none absolute right-4 text-text-soft" width={16} height={16} />
                }
              >
                <select
                  id="auth-country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCity("");
                    setStep2Errors((prev) => ({ ...prev, country: undefined, city: undefined }));
                  }}
                  required
                  className={`w-full appearance-none !pl-[46px] !pr-12 py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass}`}
                >
                  <option value="">Select country</option>
                  {agencyCountryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="auth-city"
                label="City"
                required
                icon={<MapPinIcon width={18} height={18} />}
                error={step2Errors.city}
                trailing={
                  <ChevronDownIcon className="pointer-events-none absolute right-4 text-text-soft" width={16} height={16} />
                }
              >
                <select
                  id="auth-city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setStep2Errors((prev) => ({ ...prev, city: undefined }));
                  }}
                  required
                  disabled={!country}
                  className={`w-full appearance-none !pl-[46px] !pr-12 py-[15px] ${authFieldSurfaceClass} ${authFieldBaseClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <option value="">{country ? "Select city" : "Select country first"}</option>
                  {countryCityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {auth.error && !isRegisterFieldError && <div className="p-3 rounded-sm bg-status-danger/[0.06] border border-status-danger/[0.18] text-status-danger text-[0.86rem] font-semibold leading-relaxed text-center" role="alert">{auth.error.message}</div>}

            <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-3 min-h-[54px] px-7 py-4 border border-transparent rounded-pill text-base font-extrabold cursor-pointer bg-accent text-white shadow-[0_16px_32px_rgba(216,180,160,0.26)] hover:-translate-y-px hover:bg-[#dbbfae] transition-all disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none" disabled={auth.loading}>
              {auth.loading ? "Setting up your agency…" : "Create my agency"}
            </button>

            {!isAuthenticated && (
              <button type="button" className="inline-flex items-center justify-center gap-2 mt-1 bg-none border-none text-text-muted text-[0.88rem] font-bold cursor-pointer transition-colors hover:text-secondary" onClick={handleStep2Back}>
                <ArrowLeftIcon width={16} height={16} />
                Back to account type
              </button>
            )}
          </form>
        </>
      )}
    </>
  );
}
