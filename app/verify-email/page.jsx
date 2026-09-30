"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmailVerification, requestEmailVerification } from "../lib/api/index.js";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailHint = searchParams.get("email");
  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [error, setError] = useState(null);
  const [resendEmail, setResendEmail] = useState(emailHint ?? "");
  const [resendState, setResendState] = useState({ loading: false, sent: false, error: null });
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        await confirmEmailVerification(token);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => router.push("/login?verified=1"), 2200);
    return () => clearTimeout(timer);
  }, [status, router]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendState({ loading: true, sent: false, error: null });
    try {
      await requestEmailVerification(resendEmail.trim());
      setResendState({ loading: false, sent: true, error: null });
    } catch (err) {
      setResendState({ loading: false, sent: false, error: err });
    }
  };

  return (
    <main className="min-h-screen px-5 py-7 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,56,67,0.16),_transparent_32%),linear-gradient(180deg,_rgba(248,247,245,0.98),_rgba(239,241,243,0.94))]">
      <div className="w-full max-w-[560px] rounded-3xl border border-border bg-white/92 dark:bg-surface-elevated/90 shadow-strong overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-border/70">
          <p className="text-secondary font-bold uppercase tracking-[0.18em] text-[0.72rem] mb-3">Email verification</p>

          {status === "verifying" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">Confirming your email…</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">Hang tight while we verify your link.</p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">You&apos;re verified.</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                Your Voyage account is ready. Taking you to sign in…
              </p>
            </>
          )}

          {status === "missing" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">Missing verification link</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                Open the link we emailed you, or request a new one below.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">This link can&apos;t be used</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                {error?.message ?? "Your verification link is invalid or expired."} Request a new one and try again.
              </p>
            </>
          )}
        </div>

        <div className="p-8 sm:p-10 flex flex-col gap-5">
          {status === "success" ? (
            <Link
              href="/login?verified=1"
              className="inline-flex items-center justify-center min-h-[52px] rounded-pill bg-accent text-white font-extrabold no-underline hover:-translate-y-0.5 transition"
            >
              Continue to sign in
            </Link>
          ) : (
            <form onSubmit={handleResend} className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">Email address</span>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-soft focus:outline-none focus:border-secondary"
                />
              </label>
              {resendState.sent && (
                <p className="text-sm rounded-lg bg-[rgba(32,178,170,0.08)] border border-[rgba(32,178,170,0.22)] px-3 py-2">
                  If an account exists for that email, we sent a new verification link.
                </p>
              )}
              {resendState.error && (
                <p className="text-sm text-status-danger" role="alert">
                  {resendState.error.message}
                </p>
              )}
              <button
                type="submit"
                disabled={resendState.loading || !resendEmail.trim()}
                className="inline-flex items-center justify-center min-h-[48px] rounded-pill bg-accent text-white font-extrabold disabled:opacity-55 disabled:cursor-not-allowed hover:-translate-y-0.5 transition"
              >
                {resendState.loading ? "Sending…" : "Send a new verification link"}
              </button>
            </form>
          )}

          <Link href="/login" className="text-center text-secondary font-bold text-sm no-underline hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-text-muted">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
