"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { lookupInvitation, acceptInvitation } from "../lib/api/index.js";
import { setPendingInviteToken } from "../hooks/useAuth.js";

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState({ status: token ? "loading" : "missing", invitation: null, error: null });
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await lookupInvitation(token);
        if (cancelled) return;
        setState({ status: "ready", invitation: data.invitation, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", invitation: null, error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const currentUser = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("voyage-user");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  })();

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await acceptInvitation(token);
      setPendingInviteToken(null);
      router.push("/?authenticated=1&tab=team&invited=1");
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err }));
      setAccepting(false);
    }
  };

  const startRegister = () => {
    setPendingInviteToken(token);
    const params = new URLSearchParams({ invite: token });
    if (state.invitation?.email) params.set("email", state.invitation.email);
    router.push(`/login?mode=register&${params.toString()}`);
  };

  const startLogin = () => {
    setPendingInviteToken(token);
    const params = new URLSearchParams({ invite: token });
    if (state.invitation?.email) params.set("email", state.invitation.email);
    router.push(`/login?${params.toString()}`);
  };

  return (
    <main className="min-h-screen px-5 py-7 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,56,67,0.16),_transparent_32%),linear-gradient(180deg,_rgba(248,247,245,0.98),_rgba(239,241,243,0.94))]">
      <div className="w-full max-w-[560px] rounded-3xl border border-border bg-white/92 dark:bg-surface-elevated/90 shadow-strong overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-border/70">
          <p className="text-secondary font-bold uppercase tracking-[0.18em] text-[0.72rem] mb-3">Agency invitation</p>

          {state.status === "loading" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">Checking your invitation…</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">One moment.</p>
            </>
          )}

          {state.status === "missing" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">No invitation link</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                Open the link in your invitation email to continue.
              </p>
            </>
          )}

          {state.status === "ready" && state.invitation && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">
                Join {state.invitation.agencyName}
              </h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                <strong className="text-text-primary">{state.invitation.inviterName}</strong> invited you to join{" "}
                <strong className="text-text-primary">{state.invitation.agencyName}</strong> as{" "}
                <strong className="text-text-primary">{state.invitation.role}</strong>.
              </p>
              <p className="text-text-soft text-[0.9rem] mt-3">
                Invitation for <code className="font-mono text-[0.88rem]">{state.invitation.email}</code>
              </p>
            </>
          )}

          {state.status === "error" && (
            <>
              <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] leading-tight mb-3">This invitation can&apos;t be used</h1>
              <p className="text-text-muted text-[1rem] leading-[1.7] max-w-[44ch]">
                {state.error?.message ?? "Your invitation link is invalid, expired, or already used."}
              </p>
            </>
          )}
        </div>

        <div className="p-8 sm:p-10 flex flex-col gap-4">
          {state.status === "ready" && state.invitation && (() => {
            const userEmail = currentUser?.email?.toLowerCase();
            const inviteEmail = state.invitation.emailNormalized;
            const matchesCurrent = userEmail && inviteEmail && userEmail === inviteEmail;

            if (matchesCurrent) {
              return (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accepting}
                    className="inline-flex items-center justify-center min-h-[52px] rounded-pill bg-accent text-white font-extrabold disabled:opacity-55 hover:-translate-y-0.5 transition"
                  >
                    {accepting ? "Joining…" : `Accept and join ${state.invitation.agencyName}`}
                  </button>
                  <Link href="/" className="text-center text-secondary font-bold text-sm no-underline hover:underline">
                    Maybe later
                  </Link>
                </>
              );
            }

            if (currentUser) {
              return (
                <div className="rounded-2xl border border-status-danger/[0.18] bg-status-danger/[0.06] p-5 text-text-primary text-sm">
                  <p className="font-bold mb-2">Wrong account signed in</p>
                  <p className="text-text-muted leading-6">
                    You&apos;re signed in as <strong>{currentUser.email}</strong>, but this invitation is for{" "}
                    <strong>{state.invitation.email}</strong>. Sign out and sign in with the invited email.
                  </p>
                  <Link href="/" className="inline-flex mt-3 text-secondary font-bold text-sm no-underline hover:underline">
                    Go to home
                  </Link>
                </div>
              );
            }

            if (state.invitation.accountExists) {
              return (
                <>
                  <button
                    type="button"
                    onClick={startLogin}
                    className="inline-flex items-center justify-center min-h-[52px] rounded-pill bg-accent text-white font-extrabold hover:-translate-y-0.5 transition"
                  >
                    Sign in to accept
                  </button>
                  <p className="text-center text-text-soft text-sm">
                    You already have a Voyage account — sign in to join.
                  </p>
                </>
              );
            }

            return (
              <>
                <button
                  type="button"
                  onClick={startRegister}
                  className="inline-flex items-center justify-center min-h-[52px] rounded-pill bg-accent text-white font-extrabold hover:-translate-y-0.5 transition"
                >
                  Create your account
                </button>
                <p className="text-center text-text-soft text-sm">
                  We&apos;ll set up your Voyage account, verify your email, then add you to the agency.
                </p>
              </>
            );
          })()}

          {state.status === "error" && (
            <Link href="/login" className="inline-flex items-center justify-center min-h-[52px] rounded-pill border border-border text-secondary font-bold no-underline hover:bg-surface-elevated">
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-text-muted">Loading…</div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}
