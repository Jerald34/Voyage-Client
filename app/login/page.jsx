"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import LegalModal from "../components/auth/LegalModal.jsx";
import FloatingOrb from "../components/auth/FloatingOrb.jsx";
import WizardProgress from "../components/auth/WizardProgress.jsx";
import LoginForm from "../components/auth/LoginForm.jsx";
import RegisterWizard from "../components/auth/RegisterWizard.jsx";
import { ArrowLeftIcon } from "../components/icons/index.js";

function AuthShell() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [wizardStep, setWizardStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

  useEffect(() => {
    setMounted(true);

    // Honor ?mode=register (used by accept-invite redirect for new accounts)
    if (searchParams.get("mode") === "register") {
      setMode("register");
      setWizardStep(1);
    }

    // Handle OAuth return — user is already authenticated, go to step 2
    const stepParam = searchParams.get("step");
    if (stepParam === "agency") {
      const storedUser = localStorage.getItem("voyage-user");
      if (storedUser) {
        setIsAuthenticated(true);
        setMode("register");
        setWizardStep(2);
      }
    }

    // PENDING guard: authenticated user who hasn't chosen an account type yet.
    // Only activates when page.jsx explicitly redirects here with ?step=type
    // (meaning the server confirmed the session is live and accountType=PENDING).
    // We do NOT read accountType from localStorage here — stale PENDING entries
    // from a previous abandoned signup would otherwise trap fully-registered users
    // in the wizard every time they try to sign in.
    if (stepParam === "type") {
      const storedUser = localStorage.getItem("voyage-user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user?.accountType === "PENDING") {
            setIsAuthenticated(true);
            setMode("register");
            setWizardStep("type");
          }
        } catch (_) {
          // ignore malformed stored user
        }
      }
    }
  }, [searchParams]);

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    setIsTransitioning(true);
    auth.setError(null);
    setTimeout(() => {
      setMode(newMode);
      setWizardStep(1);
      setIsTransitioning(false);
    }, 280);
  };

  const handleWizardComplete = () => {
    router.push("/?authenticated=1");
  };

  const isRegister = mode === "register";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 min-h-screen md:min-h-[calc(100vh-100px)] gap-0 md:rounded-lg md:overflow-hidden md:border md:border-border md:shadow-strong transition-all duration-650 ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.985]"}`}>
      {/* LEFT: Brand showcase panel — hidden on mobile, shown md+ */}
      <div className="hidden md:relative md:flex md:flex-col justify-center p-[clamp(40px,5vw,72px)] bg-gradient-to-br from-[#223843] via-[#1a2e38] to-[#2d3436] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <FloatingOrb delay="0s" size="320px" left="-80px" top="-60px" />
          <FloatingOrb delay="2.4s" size="200px" left="60%" top="55%" />
          <FloatingOrb delay="4.8s" size="140px" left="30%" top="80%" />
        </div>

        <div className="relative z-[2] flex flex-col gap-12">
          <Link href="/" className="inline-block text-[rgba(255,255,255,0.92)] font-serif text-2xl font-normal tracking-[-0.03em] no-underline transition-colors duration-200 hover:text-accent" aria-label="Back to home">
            Voyage
          </Link>

          <div className="flex flex-col gap-0">
            <span className="inline-flex items-center gap-2.5 mb-5 text-accent font-extrabold text-[0.76rem] tracking-[0.18em] uppercase">
              <span className="w-11 h-px bg-current opacity-55" />
              Welcome aboard
            </span>
            <h1 className="text-white text-[clamp(2rem,3.2vw,3rem)] font-serif font-normal leading-tight max-w-56 mb-5">
              {isRegister && wizardStep === 2
                ? "Tell us about your agency"
                : isRegister && wizardStep === "type"
                ? "One quick choice"
                : "Every great trip starts with a single step"}
            </h1>
            <p className="text-[rgba(255,255,255,0.58)] text-[1.05rem] max-w-[42ch] leading-[1.7]">
              {isRegister && wizardStep === 2
                ? "We'll review your application and get you set up quickly."
                : isRegister && wizardStep === "type"
                ? "Tell us how you'll use Voyage so we can set up the right workspace for you."
                : "Plan smarter itineraries with AI-powered route logic, real-time collaboration, and map-aware scheduling — all in one workspace."}
            </p>
          </div>

        </div>
      </div>

      {/* RIGHT: Auth form */}
      <div className="flex flex-col p-6 sm:p-10 md:p-[clamp(28px,4vw,56px)] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(239,241,243,0.94)] dark:from-[rgba(26,29,33,0.98)] dark:to-[rgba(17,20,22,0.94)] overflow-y-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-text-muted text-xs font-bold no-underline transition-colors duration-160 hover:text-secondary">
            <ArrowLeftIcon width={18} height={18} />
            Back to Voyage
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-start max-w-[440px] w-full mx-auto">
          {/* Mode toggle */}
          {!isAuthenticated && (
            <div className="relative grid grid-cols-2 p-1 mb-9 bg-[rgba(34,56,67,0.05)] dark:bg-[rgba(255,255,255,0.05)] border border-border rounded-pill">
              <button
                className={`relative z-[2] px-0 py-3 bg-none border-none font-extrabold text-xs cursor-pointer transition-colors duration-240 ${mode === "login" ? "text-text-primary" : "text-text-muted"}`}
                onClick={() => handleModeSwitch("login")}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`relative z-[2] px-0 py-3 bg-none border-none font-extrabold text-xs cursor-pointer transition-colors duration-240 ${mode === "register" ? "text-text-primary" : "text-text-muted"}`}
                onClick={() => handleModeSwitch("register")}
                type="button"
              >
                Create account
              </button>
              <div
                className="absolute top-1 left-1 rounded-pill bg-white dark:bg-surface-elevated shadow-md transition-transform duration-320"
                style={{
                  width: "calc(50% - 5px)",
                  height: "calc(100% - 10px)",
                  transform: mode === "register" ? "translateX(100%)" : "translateX(0)",
                }}
              />
            </div>
          )}

          {/* Reserve the same vertical space in both modes so the headline aligns */}
          <div className="mb-7 min-h-[28px] flex items-center justify-center">
            {isRegister ? <WizardProgress currentStep={wizardStep} /> : <div aria-hidden="true" className="h-[28px]" />}
          </div>

          <div className={`flex flex-col gap-0 ${isTransitioning ? "[animation:auth-slide-out_0.22s_ease_forwards]" : "[animation:auth-slide-in_0.32s_ease_forwards]"}`}>
            {mode === "login" && <LoginForm />}
            {isRegister && (
              <RegisterWizard
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                setIsTransitioning={setIsTransitioning}
                isAuthenticated={isAuthenticated}
                onOpenLegalDoc={setLegalDoc}
                onComplete={handleWizardComplete}
              />
            )}
          </div>

          {/* Bottom switch prompt */}
          {!isAuthenticated && (
            <p className="text-center mt-8 text-text-muted text-[0.92rem]">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                className="bg-none border-none text-secondary font-extrabold text-[0.92rem] cursor-pointer no-underline hover:text-text-primary hover:underline transition-colors"
                onClick={() => handleModeSwitch(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          )}

          {legalDoc && (
            <LegalModal
              activeDoc={legalDoc}
              onClose={() => setLegalDoc(null)}
              onSelectDoc={setLegalDoc}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="w-full max-w-[1320px] mx-auto px-0 md:px-5 pt-0 md:pt-7 pb-0 md:pb-[72px] min-h-screen">
      <div className="system-grain" aria-hidden="true" />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <AuthShell />
      </Suspense>
    </main>
  );
}
